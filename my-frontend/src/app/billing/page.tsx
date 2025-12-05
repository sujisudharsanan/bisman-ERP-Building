'use client';

/**
 * Billing Overview Dashboard
 * BISMAN ERP - Per-Tenant Billing Management
 *
 * Features:
 * - Current plan name, tier, price, features
 * - Billing cycle (monthly/annual), next billing date, trial expiry
 * - Current balance / next invoice amount
 * - Quick actions: Upgrade, Downgrade, Cancel, Update payment method
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Calendar,
  DollarSign,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Settings,
  TrendingUp,
  Zap,
  Shield,
  Users,
  HardDrive,
  Activity,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  X,
  Star,
  Crown,
  Building,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Plan {
  id: string;
  name: string;
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
  price: number;
  billingPeriod: 'monthly' | 'annual';
  features: string[];
  limits: {
    users: number;
    storage: number; // GB
    apiCalls: number;
  };
}

interface BillingSummary {
  plan: Plan;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string | null;
  nextInvoiceAmount: number;
  currentBalance: number;
  paymentMethod: {
    type: string;
    last4: string;
    expMonth: number;
    expYear: number;
    brand: string;
  } | null;
  usage: {
    users: { used: number; limit: number };
    storage: { used: number; limit: number };
    apiCalls: { used: number; limit: number };
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    'Up to 3 users',
    '1 GB storage',
    '1,000 API calls/month',
    'Basic support',
    'Core modules',
  ],
  starter: [
    'Up to 10 users',
    '10 GB storage',
    '10,000 API calls/month',
    'Email support',
    'All modules',
    'Basic analytics',
  ],
  pro: [
    'Up to 50 users',
    '100 GB storage',
    '100,000 API calls/month',
    'Priority support',
    'All modules',
    'Advanced analytics',
    'Custom branding',
    'API access',
  ],
  enterprise: [
    'Unlimited users',
    '1 TB storage',
    'Unlimited API calls',
    '24/7 phone support',
    'All modules',
    'Enterprise analytics',
    'White-labeling',
    'Dedicated account manager',
    'SLA guarantee',
    'Custom integrations',
  ],
};

const PLAN_COLORS: Record<string, string> = {
  free: '#6b7280',
  starter: '#3b82f6',
  pro: '#8b5cf6',
  enterprise: '#f59e0b',
};

const PLAN_ICONS: Record<string, React.ElementType> = {
  free: Package,
  starter: Star,
  pro: Zap,
  enterprise: Crown,
};

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
    month: 'long',
    day: 'numeric',
  });
}

function getDaysUntil(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Trial Banner
function TrialBanner({ daysLeft, onUpgrade }: { daysLeft: number; onUpgrade: () => void }) {
  const urgencyColor = daysLeft <= 3 ? 'bg-red-500' : daysLeft <= 7 ? 'bg-yellow-500' : 'bg-blue-500';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${urgencyColor} text-white rounded-xl p-4 mb-6`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6" />
          <div>
            <p className="font-semibold">
              {daysLeft > 0
                ? `Your trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
                : 'Your trial has expired'}
            </p>
            <p className="text-sm opacity-90">
              Upgrade now to keep all your data and access premium features
            </p>
          </div>
        </div>
        <button
          onClick={onUpgrade}
          className="px-4 py-2 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
        >
          Upgrade Now
        </button>
      </div>
    </motion.div>
  );
}

// Payment Failed Banner
function PaymentFailedBanner({ onUpdatePayment }: { onUpdatePayment: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-4 mb-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6" />
          <div>
            <p className="font-semibold">Payment Failed</p>
            <p className="text-sm">
              Your last payment was unsuccessful. Please update your payment method to avoid service interruption.
            </p>
          </div>
        </div>
        <button
          onClick={onUpdatePayment}
          className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
        >
          Update Payment
        </button>
      </div>
    </motion.div>
  );
}

// Current Plan Card
function CurrentPlanCard({ plan, status }: { plan: Plan; status: string }) {
  const PlanIcon = PLAN_ICONS[plan.tier] || Package;
  const planColor = PLAN_COLORS[plan.tier];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Current Plan</h2>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            status === 'active'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : status === 'trialing'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
          }`}
        >
          {status === 'trialing' ? 'Trial' : status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${planColor}15` }}
        >
          <PlanIcon className="w-8 h-8" style={{ color: planColor }} />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
            {plan.name}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {formatCurrency(plan.price)}/{plan.billingPeriod === 'monthly' ? 'mo' : 'yr'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {plan.features.slice(0, 5).map((feature, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <CheckCircle className="w-4 h-4 text-green-500" />
            {feature}
          </div>
        ))}
        {plan.features.length > 5 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 pl-6">
            +{plan.features.length - 5} more features
          </p>
        )}
      </div>
    </motion.div>
  );
}

// Billing Info Card
function BillingInfoCard({ summary }: { summary: BillingSummary }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Billing Information</h2>

      <div className="space-y-4">
        {/* Next Billing Date */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Next Billing Date</span>
          </div>
          <span className="font-medium text-gray-900 dark:text-white">
            {summary.nextBillingDate ? formatDate(summary.nextBillingDate) : 'N/A'}
          </span>
        </div>

        {/* Next Invoice Amount */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Next Invoice</span>
          </div>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(summary.nextInvoiceAmount)}
          </span>
        </div>

        {/* Current Balance */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-violet-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Current Balance</span>
          </div>
          <span
            className={`font-medium ${
              summary.currentBalance < 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'
            }`}
          >
            {formatCurrency(Math.abs(summary.currentBalance))}
            {summary.currentBalance < 0 && ' credit'}
          </span>
        </div>

        {/* Billing Cycle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-orange-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Billing Cycle</span>
          </div>
          <span className="font-medium text-gray-900 dark:text-white capitalize">
            {summary.plan.billingPeriod}
          </span>
        </div>

        {/* Current Period */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Current Period</span>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white pl-7">
            {formatDate(summary.currentPeriodStart)} — {formatDate(summary.currentPeriodEnd)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Payment Method Card
function PaymentMethodCard({ paymentMethod }: { paymentMethod: BillingSummary['paymentMethod'] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Method</h2>
        <Link
          href="/billing/payment-method"
          className="text-sm text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
        >
          Manage <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {paymentMethod ? (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <div className="w-12 h-8 bg-gradient-to-r from-violet-500 to-purple-600 rounded flex items-center justify-center text-white text-xs font-bold">
            {paymentMethod.brand.toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              •••• •••• •••• {paymentMethod.last4}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="w-5 h-5" />
            <span>No payment method on file</span>
          </div>
          <Link
            href="/billing/payment-method"
            className="mt-2 inline-block text-sm text-yellow-700 dark:text-yellow-400 hover:underline"
          >
            Add payment method →
          </Link>
        </div>
      )}
    </motion.div>
  );
}

// Usage Summary Card
function UsageSummaryCard({ usage }: { usage: BillingSummary['usage'] }) {
  const usageItems: Array<{
    name: string;
    icon: React.ElementType;
    used: number;
    limit: number;
    unit?: string;
    color: string;
  }> = [
    { name: 'Users', icon: Users, ...usage.users, color: '#8b5cf6' },
    { name: 'Storage', icon: HardDrive, ...usage.storage, unit: 'GB', color: '#06b6d4' },
    { name: 'API Calls', icon: Activity, ...usage.apiCalls, color: '#22c55e' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Usage This Period</h2>
        <Link
          href="/billing/usage"
          className="text-sm text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
        >
          Details <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-4">
        {usageItems.map((item) => {
          const Icon = item.icon;
          const percent = item.limit > 0 ? (item.used / item.limit) * 100 : 0;
          const isWarning = percent >= 80;
          const isCritical = percent >= 95;

          return (
            <div key={item.name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: item.color }} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.used.toLocaleString()}{item.unit ? ` ${item.unit}` : ''} / {item.limit === -1 ? '∞' : item.limit.toLocaleString()}{item.unit ? ` ${item.unit}` : ''}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(percent, 100)}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full rounded-full ${
                    isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : ''
                  }`}
                  style={{ backgroundColor: !isCritical && !isWarning ? item.color : undefined }}
                />
              </div>
              {isWarning && (
                <p className={`text-xs mt-1 ${isCritical ? 'text-red-500' : 'text-yellow-500'}`}>
                  {isCritical ? 'Limit almost reached!' : 'Approaching limit'}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Quick Actions Card
function QuickActionsCard({
  onUpgrade,
  onDowngrade,
  onCancel,
  currentTier,
}: {
  onUpgrade: () => void;
  onDowngrade: () => void;
  onCancel: () => void;
  currentTier: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>

      <div className="grid grid-cols-2 gap-3">
        {currentTier !== 'enterprise' && (
          <button
            onClick={onUpgrade}
            className="flex items-center justify-center gap-2 p-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            Upgrade Plan
          </button>
        )}

        {currentTier !== 'free' && (
          <button
            onClick={onDowngrade}
            className="flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
          >
            <ArrowDownRight className="w-4 h-4" />
            Downgrade
          </button>
        )}

        <Link
          href="/billing/payment-method"
          className="flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          Update Card
        </Link>

        <Link
          href="/billing/invoices"
          className="flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
        >
          <FileText className="w-4 h-4" />
          View Invoices
        </Link>

        <Link
          href="/settings/billing"
          className="flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
        >
          <Settings className="w-4 h-4" />
          Billing Settings
        </Link>

        {currentTier !== 'free' && (
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-2 p-3 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-medium transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Cancel Plan
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Upgrade Modal
function UpgradeModal({
  isOpen,
  onClose,
  currentTier,
  onSelectPlan,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentTier: string;
  onSelectPlan: (tier: string) => void;
}) {
  const plans = [
    { tier: 'starter', name: 'Starter', price: 29, features: PLAN_FEATURES.starter },
    { tier: 'pro', name: 'Pro', price: 79, features: PLAN_FEATURES.pro },
    { tier: 'enterprise', name: 'Enterprise', price: 199, features: PLAN_FEATURES.enterprise },
  ];

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
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Choose Your Plan</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const PlanIcon = PLAN_ICONS[plan.tier];
              const planColor = PLAN_COLORS[plan.tier];
              const isCurrent = plan.tier === currentTier;
              const isUpgrade = plans.findIndex(p => p.tier === plan.tier) > plans.findIndex(p => p.tier === currentTier);

              return (
                <div
                  key={plan.tier}
                  className={`rounded-xl border-2 p-6 ${
                    isCurrent
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                      : 'border-gray-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${planColor}15` }}
                    >
                      <PlanIcon className="w-5 h-5" style={{ color: planColor }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ${plan.price}/month
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.slice(0, 5).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => onSelectPlan(plan.tier)}
                    disabled={isCurrent}
                    className={`w-full py-2 rounded-lg font-medium transition-colors ${
                      isCurrent
                        ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 cursor-not-allowed'
                        : 'bg-violet-600 hover:bg-violet-700 text-white'
                    }`}
                  >
                    {isCurrent ? 'Current Plan' : isUpgrade ? 'Upgrade' : 'Select'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Cancel Confirmation Modal
function CancelModal({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [reason, setReason] = useState('');

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
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Cancel Subscription?</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Are you sure you want to cancel your subscription? You&apos;ll lose access to premium features
            at the end of your current billing period.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason for cancellation (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
              placeholder="Help us improve by sharing your feedback..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Keep Plan
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              Cancel Subscription
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BillingOverviewPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

  const fetchBillingSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${baseURL}/api/billing`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setBillingSummary(data);
      } else {
        // Use demo data
        generateDemoData();
      }
    } catch {
      generateDemoData();
    } finally {
      setIsLoading(false);
    }
  }, [baseURL]);

  const generateDemoData = () => {
    const trialEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    setBillingSummary({
      plan: {
        id: 'pro',
        name: 'Pro',
        tier: 'pro',
        price: 79,
        billingPeriod: 'monthly',
        features: PLAN_FEATURES.pro,
        limits: { users: 50, storage: 100, apiCalls: 100000 },
      },
      status: 'trialing',
      trialEndsAt: trialEnd.toISOString(),
      trialDaysLeft: 10,
      currentPeriodStart: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      nextBillingDate: trialEnd.toISOString(),
      nextInvoiceAmount: 79,
      currentBalance: 0,
      paymentMethod: {
        type: 'card',
        last4: '4242',
        expMonth: 12,
        expYear: 2026,
        brand: 'visa',
      },
      usage: {
        users: { used: 12, limit: 50 },
        storage: { used: 45, limit: 100 },
        apiCalls: { used: 67500, limit: 100000 },
      },
    });
  };

  useEffect(() => {
    fetchBillingSummary();
  }, [fetchBillingSummary]);

  const handleUpgrade = async (tier: string) => {
    try {
      const response = await fetch(`${baseURL}/api/billing/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planId: tier }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        }
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
    }
    setShowUpgradeModal(false);
  };

  const handleCancel = async () => {
    try {
      await fetch(`${baseURL}/api/billing/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      fetchBillingSummary();
    } catch (error) {
      console.error('Cancel failed:', error);
    }
    setShowCancelModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading billing information...</p>
        </div>
      </div>
    );
  }

  if (!billingSummary) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Billing Not Available
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Unable to load billing information. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-violet-500" />
            Billing Overview
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your subscription, payment methods, and billing preferences
          </p>
        </div>

        {/* Trial Banner */}
        {billingSummary.status === 'trialing' && billingSummary.trialDaysLeft !== null && (
          <TrialBanner
            daysLeft={billingSummary.trialDaysLeft}
            onUpgrade={() => setShowUpgradeModal(true)}
          />
        )}

        {/* Payment Failed Banner */}
        {billingSummary.status === 'past_due' && (
          <PaymentFailedBanner onUpdatePayment={() => window.location.href = '/billing/payment-method'} />
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CurrentPlanCard plan={billingSummary.plan} status={billingSummary.status} />
          <BillingInfoCard summary={billingSummary} />
          <PaymentMethodCard paymentMethod={billingSummary.paymentMethod} />
          <UsageSummaryCard usage={billingSummary.usage} />
          <div className="lg:col-span-2">
            <QuickActionsCard
              onUpgrade={() => setShowUpgradeModal(true)}
              onDowngrade={() => setShowUpgradeModal(true)}
              onCancel={() => setShowCancelModal(true)}
              currentTier={billingSummary.plan.tier}
            />
          </div>
        </div>

        {/* Modals */}
        <AnimatePresence>
          {showUpgradeModal && (
            <UpgradeModal
              isOpen={showUpgradeModal}
              onClose={() => setShowUpgradeModal(false)}
              currentTier={billingSummary.plan.tier}
              onSelectPlan={handleUpgrade}
            />
          )}
          {showCancelModal && (
            <CancelModal
              isOpen={showCancelModal}
              onClose={() => setShowCancelModal(false)}
              onConfirm={handleCancel}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
