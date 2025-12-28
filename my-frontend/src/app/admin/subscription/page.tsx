'use client';

/**
 * BISMAN ERP - Admin Subscription Dashboard
 * 
 * Micro-Unlock subscription control panel for tenants.
 * "Pay for freedom, not access" - All features visible, pay to remove limits.
 * 
 * Sections:
 * 0. Coupon Activation (when no active subscription)
 * 1. Subscription Overview (sticky header)
 * 2. Usage Health Summary (3 cards)
 * 3. Feature Unlock Control Table (heart of the system)
 * 4. Usage & Limits Breakdown
 * 5. Resource Consumption Panel
 * 6. Billing Summary
 * 7. Billing History & Invoices
 * 
 * @page /admin/subscription
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Users,
  Building,
  Activity,
  FileText,
  Download,
  CreditCard,
  BarChart3,
  Lock,
  Unlock,
  RefreshCw,
  ChevronRight,
  Zap,
  Shield,
  Calendar,
  HardDrive,
  Database,
  Layers,
  Eye,
  X,
  Check,
  Info,
  Ticket,
  Gift,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import Input from '@/components/ui/Input';

// ============================================================================
// TYPES
// ============================================================================

interface FeatureUsage {
  feature_key: string;
  feature_name: string;
  category: string;
  default_limit: number;
  limit_period: string;
  base_price: number;
  icon: string;
  current_usage: number;
  lifetime_usage: number;
  reset_at: string;
  status: 'OK' | 'NEAR_LIMIT' | 'LIMITED' | 'UNLOCKED';
  unlock_status: string | null;
  unlock_price: number | null;
  auto_renew: boolean | null;
}

interface FeatureUnlock {
  id: number;
  feature_key: string;
  feature_name: string;
  description: string;
  category: string;
  icon: string;
  price_per_month: number;
  start_date: string;
  billing_start_date: string;
  auto_renew: boolean;
}

interface BillingLineItem {
  type: string;
  name: string;
  amount: number;
  featureKey?: string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  total_amount: number;
  currency: string;
  status: string;
  invoice_date: string;
  due_date: string;
  paid_at: string | null;
  line_items: BillingLineItem[];
}

// NEW: Spend Control Types
interface SpendLimits {
  monthlyCapAmount: number;
  currentMonthSpend: number;
  billingMonth: string;
  spendPercentage: number;
  remainingBudget: number;
  alertThresholdPct: number;
  capReached: boolean;
}

// NEW: Blocked Users Types (Usage Pressure Signals)
interface BlockedUserSummary {
  feature_key: string;
  feature_name: string;
  icon: string;
  base_price: number;
  users_blocked: number;
  last_hit: string;
  last_hit_display: string;
}

interface SubscriptionData {
  overview: {
    planName: string;
    billingCycle: string;
    estimatedBill: number;
    activeUnlocks: number;
    cycleEnds: string;
    currency: string;
  };
  health: {
    status: string;
    summary: {
      ok: number;
      nearLimit: number;
      limited: number;
      unlocked: number;
    };
    featuresNearLimit: string[];
  };
  features: FeatureUsage[];
  unlocks: FeatureUnlock[];
  resources: {
    users: { total: number; active: number };
    branches: number;
    tasks: number;
    payments: number;
    reports: number;
    storage: { db: string; files: string };
  };
  billing: {
    lineItems: BillingLineItem[];
    subtotal: number;
    total: number;
    currency: string;
  };
  invoices: Invoice[];
  // NEW: Added spend control and blocked users
  spendLimits?: SpendLimits;
  blockedUsers?: BlockedUserSummary[];
}

// ============================================================================
// COUPON ACTIVATION TYPES
// ============================================================================

interface CouponSubscriptionStatus {
  ok: boolean;
  hasSubscription: boolean;
  isActive?: boolean;
  status: string | null;
  plan: {
    id: number;
    name: string;
    description: string;
    tier: string;
    billing_cycle: string;
  } | null;
  planSnapshot?: Record<string, unknown>;
  startedAt?: string;
  expiresAt?: string;
  remainingTime: {
    days: number;
    hours: number;
    minutes: number;
    totalHours: number;
  } | null;
  activationSource?: string;
}

interface CouponValidationResult {
  ok: boolean;
  valid: boolean;
  plan?: {
    id: number;
    name: string;
    description: string;
    tier: string;
    billing_cycle: string;
    features?: Record<string, unknown>;
  };
  durationDays?: number;
  validUntil?: string;
  message?: string;
  error?: string;
}

interface CouponRedemptionResult {
  ok: boolean;
  message: string;
  subscription?: {
    plan: string;
    planCode: string;
    startedAt: string;
    expiresAt: string;
    remainingTime: {
      days: number;
      hours: number;
    };
  };
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PERIOD_LABELS: Record<string, string> = {
  DAILY: '/day',
  WEEKLY: '/week',
  MONTHLY: '/month',
  YEARLY: '/year',
};

const STATUS_COLORS = {
  OK: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  NEAR_LIMIT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  LIMITED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  UNLOCKED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

const STATUS_ICONS = {
  OK: CheckCircle,
  NEAR_LIMIT: AlertTriangle,
  LIMITED: XCircle,
  UNLOCKED: Unlock,
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  tasks: FileText,
  payments: CreditCard,
  reports: BarChart3,
  reconciliation: RefreshCw,
  audit: Shield,
  communication: Activity,
  integrations: Layers,
  advanced: Zap,
};

// ============================================================================
// API HELPERS
// ============================================================================

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/micro-unlock${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'API Error');
  return data;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatResetTime(resetAt: string | null): string {
  if (!resetAt) return '';
  const now = new Date();
  const reset = new Date(resetAt);
  const diffMs = reset.getTime() - now.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHrs > 24) return `${Math.floor(diffHrs / 24)}d`;
  if (diffHrs > 0) return `${diffHrs}h ${diffMins}m`;
  if (diffMins > 0) return `${diffMins}m`;
  return 'soon';
}

function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Coupon Activation Section (when no active subscription)
interface CouponActivationSectionProps {
  subscriptionStatus: CouponSubscriptionStatus | null;
  onActivationSuccess: () => void;
}

function CouponActivationSection({ subscriptionStatus, onActivationSuccess }: CouponActivationSectionProps) {
  const [couponCode, setCouponCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [validationResult, setValidationResult] = useState<CouponValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      setError('Please enter an activation code');
      return;
    }

    setValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      const response = await fetch('/api/subscriptions/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: couponCode.trim().toUpperCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error || 'Invalid coupon code');
        return;
      }

      setValidationResult(data);
    } catch (err) {
      console.error('Coupon validation failed:', err);
      setError('Failed to validate coupon. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  const handleRedeemCoupon = async () => {
    if (!validationResult?.valid) {
      setError('Please validate the coupon first');
      return;
    }

    setRedeeming(true);
    setError(null);

    try {
      const response = await fetch('/api/subscriptions/redeem-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: couponCode.trim().toUpperCase() }),
      });

      const data: CouponRedemptionResult = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.message || data.error || 'Failed to activate subscription');
        return;
      }

      setSuccess(data.message);
      setValidationResult(null);
      setCouponCode('');
      
      // Notify parent to refresh data
      setTimeout(() => {
        onActivationSuccess();
      }, 2000);
    } catch (err) {
      console.error('Coupon redemption failed:', err);
      setError('Failed to activate subscription. Please try again.');
    } finally {
      setRedeeming(false);
    }
  };

  const handleClear = () => {
    setCouponCode('');
    setValidationResult(null);
    setError(null);
    setSuccess(null);
  };

  // If there's an active subscription, show current status
  if (subscriptionStatus?.hasSubscription && subscriptionStatus.isActive && subscriptionStatus.remainingTime && subscriptionStatus.expiresAt) {
    const expiresAt = new Date(subscriptionStatus.expiresAt);
    const isExpiringSoon = subscriptionStatus.remainingTime.days <= 7;
    const planName = subscriptionStatus.plan?.name || 'Unknown Plan';
    const activationSource = subscriptionStatus.activationSource;

    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto px-6 pt-6"
      >
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100">
                    Active Subscription: {planName}
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {activationSource === 'COUPON' ? (
                      <>Activated via coupon</>
                    ) : (
                      <>Activated via {activationSource?.toLowerCase() || 'system'}</>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={`text-sm font-medium ${isExpiringSoon ? 'text-amber-600 dark:text-amber-400' : 'text-green-700 dark:text-green-300'}`}>
                    {isExpiringSoon && <AlertTriangle className="w-4 h-4 inline mr-1" />}
                    {subscriptionStatus.remainingTime.days} days, {subscriptionStatus.remainingTime.hours} hours remaining
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Expires: {expiresAt.toLocaleDateString()} at {expiresAt.toLocaleTimeString()}
                  </p>
                </div>
                
                {isExpiringSoon && (
                  <Badge variant="warning" className="animate-pulse">
                    Expiring Soon
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // No active subscription - show activation form
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-6 pt-6"
    >
      <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
              <Ticket className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-amber-900 dark:text-amber-100">
                No Active Subscription
              </CardTitle>
              <CardDescription className="text-amber-700 dark:text-amber-300">
                Enter your activation code to unlock your subscription
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-4 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg"
            >
              <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">{success}</p>
                <p className="text-sm text-green-600 dark:text-green-400">Refreshing page...</p>
              </div>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800 dark:text-red-400"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Coupon Input */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                value={couponCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setValidationResult(null);
                  setError(null);
                }}
                placeholder="Enter activation code (e.g., BIS-XXXX-XXXX-XXXX)"
                className="text-lg font-mono tracking-wider uppercase"
                disabled={validating || redeeming || !!success}
              />
            </div>
            {couponCode && !validationResult && (
              <Button
                onClick={handleValidateCoupon}
                disabled={validating || !couponCode.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {validating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Validate
                  </>
                )}
              </Button>
            )}
            {couponCode && (
              <Button variant="outline" onClick={handleClear} disabled={validating || redeeming}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Validation Result Preview */}
          {validationResult?.valid && validationResult.plan && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <Gift className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Valid Coupon Code
                  </h4>
                  
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Plan</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {validationResult.plan.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Tier</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {validationResult.plan.tier}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Duration</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {validationResult.durationDays} days
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Billing Cycle</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                        {validationResult.plan.billing_cycle?.toLowerCase() || 'N/A'}
                      </p>
                    </div>
                    {validationResult.validUntil && (
                      <div className="col-span-2">
                        <p className="text-gray-500 dark:text-gray-400">Coupon Valid Until</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {new Date(validationResult.validUntil).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {validationResult.plan.description && (
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      {validationResult.plan.description}
                    </p>
                  )}

                  {validationResult.message && (
                    <p className="mt-3 text-sm text-green-700 dark:text-green-300 font-medium">
                      {validationResult.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={handleRedeemCoupon}
                  disabled={redeeming}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                >
                  {redeeming ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Activating Subscription...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Activate Subscription Now
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Help Text */}
          <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              Activation codes are provided by your Bisman account manager. 
              Contact support if you don&apos;t have a code or need assistance.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Subscription Overview Header (Sticky)
function SubscriptionOverview({ overview }: { overview: SubscriptionData['overview'] }) {
  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Subscription Overview
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{overview.planName}</Badge>
              <span className="text-sm text-gray-500">
                {overview.billingCycle} Billing
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(overview.estimatedBill)}
              </p>
              <p className="text-xs text-gray-500">Estimated Bill (This Month)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {overview.activeUnlocks}
              </p>
              <p className="text-xs text-gray-500">Active Unlocks</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {formatDate(overview.cycleEnds)}
              </p>
              <p className="text-xs text-gray-500">Cycle Ends</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Usage Health Summary Cards
function UsageHealthSummary({ 
  health, 
  unlocks,
  onScrollTo 
}: { 
  health: SubscriptionData['health']; 
  unlocks: FeatureUnlock[];
  onScrollTo: (section: string) => void;
}) {
  const getHealthColor = () => {
    if (health.status === 'THROTTLED') return 'border-red-500 bg-red-50 dark:bg-red-900/20';
    if (health.status === 'APPROACHING_LIMITS') return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
    return 'border-green-500 bg-green-50 dark:bg-green-900/20';
  };

  const getHealthIcon = () => {
    if (health.status === 'THROTTLED') return <XCircle className="w-6 h-6 text-red-500" />;
    if (health.status === 'APPROACHING_LIMITS') return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
    return <CheckCircle className="w-6 h-6 text-green-500" />;
  };

  const getHealthLabel = () => {
    if (health.status === 'THROTTLED') return 'Some features throttled';
    if (health.status === 'APPROACHING_LIMITS') return 'Approaching limits';
    return 'All systems healthy';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card 1: Usage Health */}
      <div 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onScrollTo('usage')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onScrollTo('usage')}
      >
        <Card className={`border-l-4 ${getHealthColor()}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Usage Health</p>
                <p className="text-lg font-semibold mt-1">{getHealthLabel()}</p>
                {health.summary.limited > 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    {health.summary.limited} feature{health.summary.limited > 1 ? 's' : ''} at limit
                  </p>
                )}
                {health.summary.nearLimit > 0 && (
                  <p className="text-sm text-yellow-600 mt-1">
                    {health.summary.nearLimit} nearing limit
                  </p>
                )}
              </div>
              {getHealthIcon()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card 2: Active Unlocks */}
      <div 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onScrollTo('unlocks')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onScrollTo('unlocks')}
      >
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Unlocks</p>
                <div className="mt-2 space-y-1">
                  {unlocks.slice(0, 2).map(unlock => (
                    <div key={unlock.feature_key} className="flex items-center gap-2">
                      <Unlock className="w-3 h-3 text-blue-500" />
                      <span className="text-sm">{unlock.feature_name}</span>
                      <span className="text-xs text-gray-500">— ₹{unlock.price_per_month}</span>
                    </div>
                  ))}
                  {unlocks.length > 2 && (
                    <p className="text-xs text-gray-500">+{unlocks.length - 2} more</p>
                  )}
                  {unlocks.length === 0 && (
                    <p className="text-sm text-gray-500">No active unlocks</p>
                  )}
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-600">{unlocks.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card 3: Next Action */}
      <div 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onScrollTo('features')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onScrollTo('features')}
      >
        <Card className="border-l-4 border-purple-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Suggested Action</p>
                {health.featuresNearLimit.length > 0 ? (
                  <>
                    <p className="text-sm font-medium mt-2">
                      Unlock {health.featuresNearLimit[0].replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      to avoid {health.summary.nearLimit > 1 ? 'weekly' : 'daily'} limit
                    </p>
                  </>
                ) : health.summary.limited > 0 ? (
                  <p className="text-sm mt-2">
                    Review throttled features
                  </p>
                ) : (
                  <p className="text-sm text-green-600 mt-2">
                    No action needed! 🎉
                  </p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// SPEND CONTROL PANEL (NEW - Finance Protection)
// ============================================================================

function SpendControlPanel({ 
  spendLimits, 
  onUpdateLimit 
}: { 
  spendLimits: SpendLimits | null | undefined;
  onUpdateLimit: (newLimit: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [newLimit, setNewLimit] = useState(spendLimits?.monthlyCapAmount || 5000);

  if (!spendLimits) return null;

  const spendPercentage = Math.min(100, spendLimits.spendPercentage);
  const isNearLimit = spendPercentage >= 80;
  const isAtLimit = spendLimits.capReached;

  const handleSave = () => {
    onUpdateLimit(newLimit);
    setIsEditing(false);
  };

  return (
    <Card className={`border-l-4 ${isAtLimit ? 'border-red-500' : isNearLimit ? 'border-yellow-500' : 'border-green-500'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="w-5 h-5" />
            Monthly Spend Control
          </CardTitle>
          {isAtLimit && (
            <Badge variant="destructive">Cap Reached</Badge>
          )}
        </div>
        <CardDescription>
          Control your monthly subscription spending
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Current Spend</span>
            <span className="text-gray-500">
              {formatCurrency(spendLimits.currentMonthSpend)} / {formatCurrency(spendLimits.monthlyCapAmount)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all ${
                isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${spendPercentage}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(spendLimits.currentMonthSpend)}
            </p>
            <p className="text-xs text-gray-500">Current Spend</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(spendLimits.monthlyCapAmount)}
            </p>
            <p className="text-xs text-gray-500">Max Allowed</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className={`text-2xl font-bold ${spendLimits.remainingBudget < 0 ? 'text-red-500' : 'text-green-600'}`}>
              {formatCurrency(Math.max(0, spendLimits.remainingBudget))}
            </p>
            <p className="text-xs text-gray-500">Remaining</p>
          </div>
        </div>

        {/* Warning Message */}
        {isAtLimit && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Monthly spend limit reached
                </p>
                <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                  Increase your limit to unlock more services this month.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Edit Limit */}
        {isEditing ? (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">₹</span>
            <input
              type="number"
              value={newLimit}
              onChange={(e) => setNewLimit(Number(e.target.value))}
              className="flex-1 p-2 border rounded-lg text-lg font-bold"
              min={spendLimits.currentMonthSpend}
              step={500}
            />
            <Button size="sm" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
        ) : (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setIsEditing(true)}
          >
            Adjust Spend Limit
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// USAGE PRESSURE SIGNALS (NEW - Blocked Users Panel)
// ============================================================================

function UsagePressureSignals({ 
  blockedUsers,
  onUnlockFeature 
}: { 
  blockedUsers: BlockedUserSummary[] | null | undefined;
  onUnlockFeature: (featureKey: string) => void;
}) {
  if (!blockedUsers || blockedUsers.length === 0) return null;

  const totalBlocked = blockedUsers.reduce((sum, b) => sum + Number(b.users_blocked || 0), 0);

  return (
    <Card className="border-l-4 border-orange-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Usage Pressure Signals
          </CardTitle>
          <Badge variant="outline" className="text-orange-600 border-orange-300">
            {totalBlocked} user{totalBlocked > 1 ? 's' : ''} affected
          </Badge>
        </div>
        <CardDescription>
          Team members who hit usage limits recently
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {blockedUsers.map((block) => (
            <div 
              key={block.feature_key}
              className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-800 flex items-center justify-center">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {block.feature_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {block.users_blocked} user{Number(block.users_blocked) > 1 ? 's' : ''} blocked · Last: {block.last_hit_display}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  ₹{block.base_price}/mo
                </span>
                <Button 
                  size="sm"
                  onClick={() => onUnlockFeature(block.feature_key)}
                >
                  Unlock
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500">
              Unlocking these features will restore normal workflow for your team members.
              Service starts immediately, billing at end of cycle.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Unlock Confirmation Modal
function UnlockModal({
  feature,
  isOpen,
  onClose,
  onConfirm,
  loading,
}: {
  feature: FeatureUsage | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  if (!isOpen || !feature) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Unlock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Unlock Feature</h3>
                <p className="text-white/80 text-sm">{feature.feature_name}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              ₹{feature.base_price}
              <span className="text-lg font-normal text-gray-500">/month</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Unlimited {feature.feature_name.toLowerCase()}
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <Check className="w-5 h-5 text-green-500" />
              <span>Service starts immediately</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <Check className="w-5 h-5 text-green-500" />
              <span>First billing after 30 days</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <Check className="w-5 h-5 text-green-500" />
              <span>Cancel anytime, no hidden charges</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <Check className="w-5 h-5 text-green-500" />
              <span>No impact on existing data</span>
            </div>
          </div>

          <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Your current usage limit is {feature.default_limit}{PERIOD_LABELS[feature.limit_period]}. 
                After unlocking, there's no limit.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Continue with limits
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="flex-1">
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Unlock className="w-4 h-4 mr-2" />
            )}
            Unlock Now
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// Feature Unlock Control Table
function FeatureUnlockTable({
  features,
  onUnlock,
  onDisable,
  spendLimits,
}: {
  features: FeatureUsage[];
  onUnlock: (feature: FeatureUsage) => void;
  onDisable: (feature: FeatureUsage) => void;
  spendLimits?: SpendLimits | null;
}) {
  // Check if spend cap is reached
  const isCapReached = spendLimits?.capReached || false;
  const remainingBudget = spendLimits?.remainingBudget ?? Infinity;
  
  // Group by category
  const groupedFeatures = features.reduce((acc, feature) => {
    if (!acc[feature.category]) acc[feature.category] = [];
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, FeatureUsage[]>);

  return (
    <div id="features">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            Feature Unlock Control
          </CardTitle>
          <CardDescription>
            Unlock any feature for ₹100/month to remove usage limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Cap Reached Warning */}
          {isCapReached && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Monthly spend limit reached
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                    Increase your limit in Spend Control to unlock additional services.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Feature</th>
                  <th className="py-3 px-4 font-medium text-gray-600 dark:text-gray-400 text-center">Free Limit</th>
                  <th className="py-3 px-4 font-medium text-gray-600 dark:text-gray-400 text-center">Current Usage</th>
                  <th className="py-3 px-4 font-medium text-gray-600 dark:text-gray-400 text-center">Status</th>
                  <th className="py-3 px-4 font-medium text-gray-600 dark:text-gray-400 text-right">Price</th>
                  <th className="py-3 px-4 font-medium text-gray-600 dark:text-gray-400 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                  <React.Fragment key={category}>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <td colSpan={6} className="py-2 px-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                          {React.createElement(CATEGORY_ICONS[category] || Package, { className: 'w-4 h-4' })}
                          <span className="capitalize">{category}</span>
                      </div>
                    </td>
                  </tr>
                  {categoryFeatures.map((feature) => {
                    const StatusIcon = STATUS_ICONS[feature.status];
                    const isUnlocked = feature.status === 'UNLOCKED';
                    
                    return (
                      <tr 
                        key={feature.feature_key}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                      >
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {feature.feature_name}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {feature.default_limit === 0 ? (
                            <span className="text-red-500">Disabled</span>
                          ) : feature.default_limit === -1 ? (
                            <span className="text-green-500">Unlimited</span>
                          ) : (
                            <span>
                              {feature.default_limit}
                              <span className="text-gray-500 text-xs ml-1">
                                {PERIOD_LABELS[feature.limit_period]}
                              </span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isUnlocked ? (
                            <span className="text-blue-500">Unlimited</span>
                          ) : (
                            <span>
                              {feature.current_usage}/{feature.default_limit}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={`${STATUS_COLORS[feature.status]} inline-flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {feature.status === 'NEAR_LIMIT' ? 'Near Limit' : feature.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            ₹{feature.unlock_price || feature.base_price}
                          </span>
                          <span className="text-gray-500 text-xs">/mo</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isUnlocked ? (
                            <div className="flex items-center justify-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => onDisable(feature)}
                                className="text-gray-500 hover:text-red-500"
                              >
                                Disable
                              </Button>
                            </div>
                          ) : (() => {
                            const featurePrice = feature.unlock_price || feature.base_price || 100;
                            const canAfford = remainingBudget >= featurePrice;
                            const isBlocked = isCapReached || !canAfford;
                            
                            return (
                              <div className="relative group">
                                <Button 
                                  size="sm"
                                  onClick={() => !isBlocked && onUnlock(feature)}
                                  disabled={isBlocked}
                                  className={`${
                                    isBlocked 
                                      ? 'opacity-50 cursor-not-allowed' 
                                      : feature.status === 'LIMITED' 
                                        ? 'bg-red-500 hover:bg-red-600' 
                                        : ''
                                  }`}
                                >
                                  <Unlock className="w-3 h-3 mr-1" />
                                  Unlock
                                </Button>
                                {/* Tooltip for blocked state */}
                                {isBlocked && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                    <div className="text-center">
                                      <p className="font-medium">Monthly spend limit reached</p>
                                      <p className="text-gray-300 mt-1">Increase your limit in Settings</p>
                                    </div>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
      </Card>
    </div>
  );
}

// Resource Consumption Panel
function ResourceConsumptionPanel({ resources }: { resources: SubscriptionData['resources'] }) {
  const items = [
    { label: 'Total Users', value: resources.users.total, icon: Users },
    { label: 'Active Users (30d)', value: resources.users.active, icon: Activity },
    { label: 'Branches', value: resources.branches, icon: Building },
    { label: 'Tasks Created', value: resources.tasks.toLocaleString(), icon: FileText },
    { label: 'Payments Processed', value: formatCurrency(resources.payments), icon: CreditCard },
    { label: 'Reports Generated', value: resources.reports, icon: BarChart3 },
    { label: 'DB Storage', value: resources.storage.db, icon: Database },
    { label: 'File Storage', value: resources.storage.files, icon: HardDrive },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-green-500" />
          Resource Consumption
        </CardTitle>
        <CardDescription>
          Usage shown for transparency. You are not billed for resources.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <div 
              key={item.label}
              className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <item.icon className="w-4 h-4" />
                <span className="text-xs">{item.label}</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Billing Summary
function BillingSummary({ billing }: { billing: SubscriptionData['billing'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-500" />
          Monthly Bill Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {billing.lineItems.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <p>No billable items this month</p>
              <p className="text-sm mt-1">Unlock features to see billing</p>
            </div>
          ) : (
            <>
              {billing.lineItems.map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    {item.type === 'base_plan' ? (
                      <Layers className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Unlock className="w-4 h-4 text-blue-500" />
                    )}
                    <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200 dark:border-gray-600">
                <span className="font-semibold text-gray-900 dark:text-gray-100">Total (This Month)</span>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(billing.total)}
                </span>
              </div>
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Download Invoice
        </Button>
        <Button variant="ghost" size="sm">
          Billing History
        </Button>
      </CardFooter>
    </Card>
  );
}

// Billing History Table
function BillingHistoryTable({ invoices }: { invoices: Invoice[] }) {
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PAID: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      OVERDUE: 'bg-red-100 text-red-800',
      GENERATED: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-500" />
          Billing History & Invoices
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No invoices yet</p>
            <p className="text-sm mt-1">Invoices will appear here after your first billing cycle</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="py-3 px-4 font-medium text-gray-600">Month</th>
                  <th className="py-3 px-4 font-medium text-gray-600">Unlocks</th>
                  <th className="py-3 px-4 font-medium text-gray-600 text-right">Amount</th>
                  <th className="py-3 px-4 font-medium text-gray-600 text-center">Status</th>
                  <th className="py-3 px-4 font-medium text-gray-600 text-center">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr 
                    key={invoice.id}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="py-3 px-4">
                      {formatDate(invoice.billing_period_start)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(invoice.line_items || []).slice(0, 2).map((item, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {item.name.replace(' Unlock', '')}
                          </Badge>
                        ))}
                        {(invoice.line_items || []).length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{invoice.line_items.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge className={getStatusBadge(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {invoice.status === 'PAID' ? (
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      ) : invoice.status === 'PENDING' || invoice.status === 'OVERDUE' ? (
                        <Button size="sm" variant="outline">
                          Pay
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function AdminSubscriptionPage() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlockingFeature, setUnlockingFeature] = useState<FeatureUsage | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [spendLimits, setSpendLimits] = useState<SpendLimits | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserSummary[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<CouponSubscriptionStatus | null>(null);

  // Fetch coupon-based subscription status
  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/subscriptions/my-subscription', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch subscription status:', err);
    }
  }, []);

  // Fetch main data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi<{ data: SubscriptionData }>('/subscription-page');
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch subscription data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch spend limits and blocked users
  const fetchSpendData = useCallback(async () => {
    try {
      const [spendResponse, blockedResponse] = await Promise.all([
        fetchApi<{ spendLimits: SpendLimits }>('/admin/spend-limit'),
        fetchApi<{ blockedUsers: BlockedUserSummary[] }>('/admin/blocked-users'),
      ]);
      setSpendLimits(spendResponse.spendLimits);
      setBlockedUsers(blockedResponse.blockedUsers || []);
    } catch (err) {
      console.error('Failed to fetch spend/blocked data:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchSpendData();
    fetchSubscriptionStatus();
  }, [fetchData, fetchSpendData, fetchSubscriptionStatus]);

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Handle unlock
  const handleUnlock = async (feature: FeatureUsage) => {
    setUnlockingFeature(feature);
  };

  // Handle unlock from blocked users panel
  const handleUnlockFromPressure = async (featureKey: string) => {
    const feature = data?.features.find(f => f.feature_key === featureKey);
    if (feature) {
      setUnlockingFeature(feature);
    }
  };

  // Handle spend limit update
  const handleUpdateSpendLimit = async (newLimit: number) => {
    try {
      await fetchApi('/admin/spend-limit', {
        method: 'PUT',
        body: JSON.stringify({ monthlyCapAmount: newLimit, reason: 'Admin updated via dashboard' }),
      });
      await fetchSpendData();
    } catch (err) {
      console.error('Failed to update spend limit:', err);
    }
  };

  const confirmUnlock = async () => {
    if (!unlockingFeature) return;
    
    setUnlockLoading(true);
    try {
      await fetchApi(`/unlock/${unlockingFeature.feature_key}`, {
        method: 'POST',
        body: JSON.stringify({ autoRenew: true }),
      });
      await Promise.all([fetchData(), fetchSpendData()]);
      setUnlockingFeature(null);
    } catch (err) {
      console.error('Failed to unlock feature:', err);
    } finally {
      setUnlockLoading(false);
    }
  };

  // Handle disable
  const handleDisable = async (feature: FeatureUsage) => {
    if (!confirm(`Are you sure you want to disable ${feature.feature_name}? Your usage limits will return.`)) {
      return;
    }
    
    try {
      await fetchApi(`/disable/${feature.feature_key}`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'User requested' }),
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to disable feature:', err);
    }
  };

  // Handler for successful coupon activation
  const handleCouponActivationSuccess = useCallback(() => {
    // Refresh all data after successful activation
    fetchData();
    fetchSpendData();
    fetchSubscriptionStatus();
  }, [fetchData, fetchSpendData, fetchSubscriptionStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading subscription data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 dark:text-gray-100 font-medium">Failed to load subscription data</p>
          <p className="text-gray-500 text-sm mt-1">{error}</p>
          <Button onClick={fetchData} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Coupon Activation Section */}
      <CouponActivationSection
        subscriptionStatus={subscriptionStatus}
        onActivationSuccess={handleCouponActivationSuccess}
      />

      {/* Sticky Overview Header */}
      <SubscriptionOverview overview={data.overview} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Usage Health Summary */}
        <UsageHealthSummary 
          health={data.health} 
          unlocks={data.unlocks}
          onScrollTo={scrollToSection}
        />

        {/* NEW: Spend Control + Usage Pressure Signals Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spend Control Panel */}
          <SpendControlPanel 
            spendLimits={spendLimits}
            onUpdateLimit={handleUpdateSpendLimit}
          />
          
          {/* Usage Pressure Signals (Blocked Users) */}
          <UsagePressureSignals 
            blockedUsers={blockedUsers}
            onUnlockFeature={handleUnlockFromPressure}
          />
        </div>

        {/* Feature Unlock Control Table */}
        <FeatureUnlockTable
          features={data.features}
          onUnlock={handleUnlock}
          onDisable={handleDisable}
          spendLimits={spendLimits}
        />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Resource Consumption (2 cols) */}
          <div className="lg:col-span-2">
            <ResourceConsumptionPanel resources={data.resources} />
          </div>
          
          {/* Right: Billing Summary (1 col) */}
          <div>
            <BillingSummary billing={data.billing} />
          </div>
        </div>

        {/* Billing History */}
        <BillingHistoryTable invoices={data.invoices} />

        {/* Philosophy Footer - Updated Copy */}
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">
            💡 <em>"Bisman ERP never sells access. It sells continuity."</em>
          </p>
          <p className="text-xs mt-1">
            All features are available to use. Unlock to restore workflow and remove limits.
          </p>
        </div>
      </div>

      {/* Unlock Modal */}
      <AnimatePresence>
        <UnlockModal
          feature={unlockingFeature}
          isOpen={!!unlockingFeature}
          onClose={() => setUnlockingFeature(null)}
          onConfirm={confirmUnlock}
          loading={unlockLoading}
        />
      </AnimatePresence>
    </div>
  );
}
