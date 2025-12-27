'use client';

/**
 * Welcome & Subscription Selection Page
 * 
 * MANDATORY GATE after first login:
 * - No sidebar, no header, no navigation
 * - Must select subscription plan before accessing any system feature
 * - Logout allowed, but back/URL manipulation redirects here
 * - Frames decision as "configuring workspace" not "buying software"
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Users,
  CheckCircle,
  Lock,
  LogOut,
  Loader2,
  ChevronDown,
  ChevronUp,
  Building2,
  BarChart3,
  Clock,
  Zap,
  Crown,
  Star,
  ArrowRight,
  AlertCircle,
  X,
} from 'lucide-react';
import { API_BASE } from '@/config/api';

// ============================================================================
// TYPES
// ============================================================================

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description?: string;
  price_monthly: number;
  price_yearly?: number;
  currency: string;
  max_users: number;
  max_branches?: number;
  max_storage_gb: number;
  trial_days: number;
  features: string[];
  is_popular?: boolean;
  is_active: boolean;
  approval_levels?: number;
  audit_retention_days?: number;
  support_tier?: string;
}

interface ConfirmationData {
  plan: SubscriptionPlan;
  billingCycle: 'monthly' | 'yearly';
  startDate: string;
  trialEndDate?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    code: 'STARTER',
    name: 'Starter',
    description: 'Perfect for small teams getting started',
    price_monthly: 999,
    price_yearly: 9990,
    currency: 'INR',
    max_users: 5,
    max_branches: 1,
    max_storage_gb: 5,
    trial_days: 14,
    features: ['Basic Reports', 'Email Support', '5 Users', '1 Branch'],
    is_popular: false,
    is_active: true,
    approval_levels: 1,
    audit_retention_days: 30,
    support_tier: 'Email',
  },
  {
    id: 'professional',
    code: 'PROFESSIONAL',
    name: 'Professional',
    description: 'For growing businesses with advanced needs',
    price_monthly: 2999,
    price_yearly: 29990,
    currency: 'INR',
    max_users: 25,
    max_branches: 5,
    max_storage_gb: 50,
    trial_days: 14,
    features: ['Advanced Reports', 'Priority Support', '25 Users', '5 Branches', 'API Access'],
    is_popular: true,
    is_active: true,
    approval_levels: 3,
    audit_retention_days: 90,
    support_tier: '24/7 Chat',
  },
  {
    id: 'enterprise',
    code: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Full control for large organizations',
    price_monthly: 9999,
    price_yearly: 99990,
    currency: 'INR',
    max_users: -1, // Unlimited
    max_branches: -1,
    max_storage_gb: 500,
    trial_days: 14,
    features: ['All Features', 'Dedicated Manager', 'Unlimited Users', 'Unlimited Branches', 'Custom Integrations', 'SLA Guarantee'],
    is_popular: false,
    is_active: true,
    approval_levels: 5,
    audit_retention_days: 365,
    support_tier: 'Dedicated Manager',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(amount: number, currency: string = 'INR'): string {
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatLimit(value: number): string {
  if (value === -1) return 'Unlimited';
  return value.toString();
}

function getTrialEndDate(trialDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + trialDays);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getTodayFormatted(): string {
  return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ============================================================================
// PLAN CARD COMPONENT
// ============================================================================

function PlanCard({
  plan,
  isSelected,
  onSelect,
}: {
  plan: SubscriptionPlan;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const Icon = plan.code === 'ENTERPRISE' ? Crown : plan.code === 'PROFESSIONAL' ? Star : Zap;
  
  return (
    <div
      onClick={onSelect}
      className={`
        relative cursor-pointer rounded-2xl border-2 p-6 transition-all duration-300
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/20 scale-[1.02]' 
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 hover:border-blue-300 hover:shadow-md'
        }
      `}
    >
      {/* Popular Badge */}
      {plan.is_popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold px-4 py-1 rounded-full shadow-lg">
            Most Popular
          </span>
        </div>
      )}

      {/* Selection Indicator */}
      <div className={`
        absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
        ${isSelected 
          ? 'border-blue-500 bg-blue-500' 
          : 'border-gray-300 dark:border-gray-600'
        }
      `}>
        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
      </div>

      {/* Plan Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center
          ${plan.code === 'ENTERPRISE' 
            ? 'bg-gradient-to-br from-amber-400 to-orange-500' 
            : plan.code === 'PROFESSIONAL' 
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
              : 'bg-gradient-to-br from-gray-400 to-gray-600'
          }
        `}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
        </div>
      </div>

      {/* Pricing */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(plan.price_monthly, plan.currency)}
          </span>
          <span className="text-gray-500 dark:text-gray-400">/month</span>
        </div>
        {plan.trial_days > 0 && (
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            {plan.trial_days}-day free trial included
          </p>
        )}
      </div>

      {/* Key Limits */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Users className="w-4 h-4 text-blue-500" />
          <span>{formatLimit(plan.max_users)} Users</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Building2 className="w-4 h-4 text-blue-500" />
          <span>{formatLimit(plan.max_branches || 1)} Branches</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          <span>{plan.approval_levels || 1} Approval Levels</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Clock className="w-4 h-4 text-blue-500" />
          <span>{plan.audit_retention_days || 30} Days Audit Retention</span>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-2">
        {plan.features.slice(0, 4).map((feature, idx) => (
          <li key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// PLAN COMPARISON MODAL
// ============================================================================

function PlanComparisonModal({
  plans,
  isOpen,
  onClose,
}: {
  plans: SubscriptionPlan[];
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Compare Plans in Detail</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Comparison Table */}
        <div className="overflow-auto max-h-[calc(85vh-80px)] p-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Feature</th>
                {plans.map(plan => (
                  <th key={plan.id} className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">Monthly Price</td>
                {plans.map(plan => (
                  <td key={plan.id} className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    {formatCurrency(plan.price_monthly, plan.currency)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">User Limit</td>
                {plans.map(plan => (
                  <td key={plan.id} className="text-center py-3 px-4 text-gray-900 dark:text-white">
                    {formatLimit(plan.max_users)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">Branch Limit</td>
                {plans.map(plan => (
                  <td key={plan.id} className="text-center py-3 px-4 text-gray-900 dark:text-white">
                    {formatLimit(plan.max_branches || 1)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">Storage</td>
                {plans.map(plan => (
                  <td key={plan.id} className="text-center py-3 px-4 text-gray-900 dark:text-white">
                    {plan.max_storage_gb} GB
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">Approval Depth</td>
                {plans.map(plan => (
                  <td key={plan.id} className="text-center py-3 px-4 text-gray-900 dark:text-white">
                    {plan.approval_levels || 1} Levels
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">Audit Retention</td>
                {plans.map(plan => (
                  <td key={plan.id} className="text-center py-3 px-4 text-gray-900 dark:text-white">
                    {plan.audit_retention_days || 30} Days
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">Support Tier</td>
                {plans.map(plan => (
                  <td key={plan.id} className="text-center py-3 px-4 text-gray-900 dark:text-white">
                    {plan.support_tier || 'Email'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">Trial Period</td>
                {plans.map(plan => (
                  <td key={plan.id} className="text-center py-3 px-4 text-gray-900 dark:text-white">
                    {plan.trial_days} Days
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CONFIRMATION PANEL
// ============================================================================

function ConfirmationPanel({
  data,
  isAgreed,
  onAgreeChange,
  onActivate,
  onChangePlan,
  isActivating,
}: {
  data: ConfirmationData;
  isAgreed: boolean;
  onAgreeChange: (agreed: boolean) => void;
  onActivate: () => void;
  onChangePlan: () => void;
  isActivating: boolean;
}) {
  const { plan } = data;

  return (
    <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-40 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Your Selection</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review and activate your workspace</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Selected Plan */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">{plan.name} Plan</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatCurrency(plan.price_monthly, plan.currency)}/month
              </p>
            </div>
          </div>
        </div>

        {/* Limits Summary */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700 dark:text-gray-300">Your Workspace Limits</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Users</p>
              <p className="font-semibold text-gray-900 dark:text-white">{formatLimit(plan.max_users)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Branches</p>
              <p className="font-semibold text-gray-900 dark:text-white">{formatLimit(plan.max_branches || 1)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Storage</p>
              <p className="font-semibold text-gray-900 dark:text-white">{plan.max_storage_gb} GB</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Approval Levels</p>
              <p className="font-semibold text-gray-900 dark:text-white">{plan.approval_levels || 1}</p>
            </div>
          </div>
        </div>

        {/* Billing Info */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700 dark:text-gray-300">Billing Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Start Date</span>
              <span className="text-gray-900 dark:text-white">{getTodayFormatted()}</span>
            </div>
            {plan.trial_days > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Trial Ends</span>
                <span className="text-green-600 dark:text-green-400">{getTrialEndDate(plan.trial_days)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">First Billing</span>
              <span className="text-gray-900 dark:text-white">
                {plan.trial_days > 0 ? `After trial (${getTrialEndDate(plan.trial_days)})` : getTodayFormatted()}
              </span>
            </div>
          </div>
        </div>

        {/* Trial Info */}
        {plan.trial_days > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-700 dark:text-green-300">
              <strong>🎉 {plan.trial_days}-Day Free Trial</strong>
              <br />
              Full access to all features. No payment required until trial ends.
            </p>
          </div>
        )}

        {/* Agreement Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isAgreed}
            onChange={(e) => onAgreeChange(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            I understand this plan controls my organization's limits and can be changed later from Admin Settings.
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
        <button
          onClick={onActivate}
          disabled={!isAgreed || isActivating}
          className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
        >
          {isActivating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Activating...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Activate Workspace
            </>
          )}
        </button>
        <button
          onClick={onChangePlan}
          disabled={isActivating}
          className="w-full py-2 px-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
        >
          Change Plan
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// ACTIVATION LOADER
// ============================================================================

function ActivationLoader() {
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-white animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Building2 className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Preparing Your Workspace...</h2>
        <p className="text-white/80">Setting up your organization's environment</p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WelcomePage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [showActivationLoader, setShowActivationLoader] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState('Your Organization');

  // Fetch available plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        // Try to fetch from API first
        const response = await fetch(`${API_BASE}/api/welcome/plans`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.plans && data.plans.length > 0) {
            setPlans(data.plans);
            if (data.organizationName) {
              setOrganizationName(data.organizationName);
            }
          } else {
            setPlans(FALLBACK_PLANS);
          }
        } else {
          // Fallback to default plans
          setPlans(FALLBACK_PLANS);
        }
      } catch (err) {
        console.error('Failed to fetch plans:', err);
        setPlans(FALLBACK_PLANS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // Handle plan selection
  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setIsAgreed(false);
  };

  // Handle workspace activation
  const handleActivate = async () => {
    if (!selectedPlan || !isAgreed) return;

    setIsActivating(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/welcome/activate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          planCode: selectedPlan.code,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Show activation loader
        setShowActivationLoader(true);
        
        // Wait for effect, then redirect
        setTimeout(() => {
          router.push('/admin');
        }, 2500);
      } else {
        setError(data.error || 'Failed to activate workspace. Please try again.');
        setIsActivating(false);
      }
    } catch (err) {
      console.error('Activation error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsActivating(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      router.push('/auth/login');
    } catch (err) {
      console.error('Logout error:', err);
      router.push('/auth/login');
    }
  };

  // Show activation loader
  if (showActivationLoader) {
    return <ActivationLoader />;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading workspace setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 ${selectedPlan ? 'pr-[400px]' : ''} transition-all duration-300`}>
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">You're Almost Set</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">One final step to activate your workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Lock className="w-4 h-4" />
              <span>Subscription can be changed later</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Message */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Your Workspace
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Choose how your business operates on Day One.
          </p>
        </div>

        {/* Authority Framing */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 mb-10 max-w-3xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                You are the Administrator of {organizationName}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                The plan you select will define:
              </p>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  How many users you can invite
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Which approvals are enforced
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  How usage, limits, and accountability are measured
                </li>
              </ul>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-3">
                You can upgrade or fine-tune limits anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-3xl mx-auto mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {plans.filter(p => p.is_active).map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isSelected={selectedPlan?.id === plan.id}
              onSelect={() => handleSelectPlan(plan)}
            />
          ))}
        </div>

        {/* Compare Plans Link */}
        <div className="text-center">
          <button
            onClick={() => setShowComparison(true)}
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Compare plans in detail
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* Confirmation Panel (Right Side) */}
      {selectedPlan && (
        <ConfirmationPanel
          data={{
            plan: selectedPlan,
            billingCycle: 'monthly',
            startDate: getTodayFormatted(),
            trialEndDate: selectedPlan.trial_days > 0 ? getTrialEndDate(selectedPlan.trial_days) : undefined,
          }}
          isAgreed={isAgreed}
          onAgreeChange={setIsAgreed}
          onActivate={handleActivate}
          onChangePlan={() => setSelectedPlan(null)}
          isActivating={isActivating}
        />
      )}

      {/* Plan Comparison Modal */}
      <PlanComparisonModal
        plans={plans.filter(p => p.is_active)}
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
      />
    </div>
  );
}
