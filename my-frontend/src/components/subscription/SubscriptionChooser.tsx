'use client';

/**
 * Subscription Chooser Component
 * 
 * Shown to clients who don't have an active subscription.
 * Flow:
 * 1. Display available plans
 * 2. FREE plan → Activate immediately
 * 3. PAID plan → Show coupon popup
 *    - Valid coupon → Activate paid plan
 *    - Start Trial button → Start 14-day trial
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  Zap,
  Star,
  Crown,
  Building2,
  Loader2,
  Gift,
  ArrowRight,
  Clock,
  Shield,
  Sparkles,
  CheckCircle,
  XCircle,
  Ticket,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

interface Plan {
  id: number;
  plan_code: string;
  name: string;
  description?: string;
  short_description?: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  max_users: number;
  max_storage_gb: number;
  max_branches: number;
  is_popular?: boolean;
  is_enterprise?: boolean;
  cta_text?: string;
  features?: string[];
}

interface SubscriptionChooserProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated: () => void;
}

const PLAN_ICONS: Record<string, React.ElementType> = {
  FREE: Star,
  STARTER: Star,
  PROFESSIONAL: Zap,
  BUSINESS: Crown,
  ENTERPRISE: Building2,
};

const PLAN_COLORS: Record<string, string> = {
  FREE: 'from-gray-100 to-gray-200 border-gray-300 dark:from-gray-700 dark:to-gray-800 dark:border-gray-600',
  STARTER: 'from-blue-50 to-blue-100 border-blue-300 dark:from-blue-900/50 dark:to-blue-800/50 dark:border-blue-700',
  PROFESSIONAL: 'from-violet-50 to-violet-100 border-violet-300 dark:from-violet-900/50 dark:to-violet-800/50 dark:border-violet-700',
  BUSINESS: 'from-amber-50 to-amber-100 border-amber-300 dark:from-amber-900/50 dark:to-amber-800/50 dark:border-amber-700',
  ENTERPRISE: 'from-emerald-50 to-emerald-100 border-emerald-300 dark:from-emerald-900/50 dark:to-emerald-800/50 dark:border-emerald-700',
};

export default function SubscriptionChooser({
  isOpen,
  onClose,
  onActivated,
}: SubscriptionChooserProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ type: 'free' | 'paid' | 'trial'; planName: string } | null>(null);

  // Fetch available plans
  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/subscriptions/plans`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.ok && data.plans) {
        setPlans(data.plans);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setError(null);
    
    // Check if it's a free plan
    if (plan.price_monthly === 0 || plan.plan_code.toUpperCase() === 'FREE') {
      // Activate free plan directly
      activateFreePlan();
    } else {
      // Show coupon modal for paid plans
      setShowCouponModal(true);
      setCouponCode('');
      setValidation(null);
    }
  };

  const activateFreePlan = async () => {
    try {
      setIsActivating(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/subscriptions/activate-free`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setSuccess({ type: 'free', planName: data.subscription?.planName || 'Free' });
        setTimeout(() => {
          onActivated();
        }, 2000);
      } else {
        setError(data.message || 'Failed to activate free plan');
      }
    } catch (err) {
      setError('Failed to activate. Please try again.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleCouponChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setCouponCode(value);
    setValidation(null);
    setError(null);
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setError('Please enter a coupon code');
      return;
    }

    try {
      setIsValidating(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/subscriptions/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: couponCode.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setValidation({ valid: true, message: data.message });
      } else {
        setValidation({ valid: false });
        setError(data.message || 'Invalid coupon code');
      }
    } catch (err) {
      setError('Failed to validate coupon');
    } finally {
      setIsValidating(false);
    }
  };

  const redeemCoupon = async () => {
    if (!validation?.valid) return;

    try {
      setIsActivating(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/subscriptions/redeem-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: couponCode.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setShowCouponModal(false);
        setSuccess({ type: 'paid', planName: data.subscription?.plan || selectedPlan?.name || 'Paid' });
        setTimeout(() => {
          onActivated();
        }, 2000);
      } else {
        setError(data.message || 'Failed to redeem coupon');
      }
    } catch (err) {
      setError('Failed to redeem coupon');
    } finally {
      setIsActivating(false);
    }
  };

  const startTrial = async () => {
    try {
      setIsActivating(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/subscriptions/start-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setShowCouponModal(false);
        setSuccess({ type: 'trial', planName: selectedPlan?.name || 'Trial' });
        setTimeout(() => {
          onActivated();
        }, 2000);
      } else {
        setError(data.message || 'Failed to start trial');
      }
    } catch (err) {
      setError('Failed to start trial');
    } finally {
      setIsActivating(false);
    }
  };

  const formatPrice = (price: number, currency: string = 'INR') => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8"
      >
        {/* Success State */}
        {success && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl p-8 text-white text-center shadow-2xl max-w-md mx-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-24 h-24 mx-auto mb-6 bg-white/20 rounded-full flex items-center justify-center"
            >
              <CheckCircle className="w-14 h-14 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-2">
              {success.type === 'free' && 'Free Plan Activated!'}
              {success.type === 'paid' && 'Subscription Activated!'}
              {success.type === 'trial' && 'Trial Started!'}
            </h2>
            <p className="text-white/90">
              {success.type === 'free' && `You're now on the ${success.planName} plan.`}
              {success.type === 'paid' && `Welcome to ${success.planName}!`}
              {success.type === 'trial' && `Your 14-day trial of ${success.planName} has begun.`}
            </p>
          </motion.div>
        )}

        {/* Plan Selection */}
        {!success && !showCouponModal && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white">
              <h1 className="text-2xl font-bold">Choose Your Plan</h1>
              <p className="text-white/80 mt-1">
                Select a plan to get started with BISMAN ERP
              </p>
            </div>

            {/* Plans Grid */}
            <div className="p-8">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {plans.map((plan) => {
                    const Icon = PLAN_ICONS[plan.plan_code.toUpperCase()] || Star;
                    const colorClass = PLAN_COLORS[plan.plan_code.toUpperCase()] || PLAN_COLORS.FREE;
                    const isFree = plan.price_monthly === 0;

                    return (
                      <motion.div
                        key={plan.id}
                        whileHover={{ scale: 1.02 }}
                        className={`relative rounded-xl border-2 p-6 cursor-pointer transition-all bg-gradient-to-b ${colorClass} ${
                          plan.is_popular ? 'ring-2 ring-violet-500' : ''
                        }`}
                        onClick={() => handlePlanSelect(plan)}
                      >
                        {plan.is_popular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                            Most Popular
                          </div>
                        )}

                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 rounded-lg bg-white/50 dark:bg-white/10">
                            <Icon className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                          </div>
                          <h3 className="font-bold text-lg text-gray-800 dark:text-white">{plan.name}</h3>
                        </div>

                        <div className="mb-4">
                          <span className="text-3xl font-bold text-gray-900 dark:text-white">
                            {formatPrice(plan.price_monthly, plan.currency)}
                          </span>
                          {!isFree && <span className="text-gray-600 dark:text-gray-300">/month</span>}
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                          {plan.short_description || plan.description || 'Get started with this plan'}
                        </p>

                        <ul className="space-y-2 mb-6 text-sm">
                          <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                            {plan.max_users === -1 ? 'Unlimited' : plan.max_users} users
                          </li>
                          <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                            {plan.max_storage_gb === -1 ? 'Unlimited' : plan.max_storage_gb} GB storage
                          </li>
                          <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                            {plan.max_branches === -1 ? 'Unlimited' : plan.max_branches} branch{plan.max_branches !== 1 ? 'es' : ''}
                          </li>
                        </ul>

                        <button
                          disabled={isActivating}
                          className={`w-full py-2.5 rounded-lg font-semibold transition-colors ${
                            isFree
                              ? 'bg-gray-800 text-white hover:bg-gray-900'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {isActivating && selectedPlan?.id === plan.id ? (
                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                          ) : isFree ? (
                            'Start Free'
                          ) : (
                            plan.cta_text || 'Select Plan'
                          )}
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {error && !showCouponModal && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg text-center">
                  {error}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Coupon Modal for Paid Plans */}
        {showCouponModal && selectedPlan && !success && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <Ticket className="w-6 h-6" />
                <div>
                  <h2 className="text-xl font-bold">Activate {selectedPlan.name}</h2>
                  <p className="text-white/80 text-sm">Enter coupon code or start a free trial</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Coupon Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Coupon Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={handleCouponChange}
                    placeholder="XXXX-XXXX-XXXX"
                    className="flex-1 px-4 py-2.5 border rounded-lg text-lg font-mono tracking-wider uppercase focus:ring-2 focus:ring-violet-500 focus:border-violet-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <button
                    onClick={validateCoupon}
                    disabled={isValidating || !couponCode.trim()}
                    className="px-4 py-2.5 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isValidating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify'}
                  </button>
                </div>

                {/* Validation Result */}
                {validation && (
                  <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                    validation.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {validation.valid ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        <span>{validation.message || 'Valid coupon!'}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5" />
                        <span>Invalid coupon code</span>
                      </>
                    )}
                  </div>
                )}

                {error && (
                  <div className="mt-3 p-3 rounded-lg bg-red-50 text-red-700 flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Activate Button (if coupon valid) */}
              {validation?.valid && (
                <button
                  onClick={redeemCoupon}
                  disabled={isActivating}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-semibold hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isActivating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Activate {selectedPlan.name}
                    </>
                  )}
                </button>
              )}

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white dark:bg-gray-800 text-sm text-gray-500">
                    or try before you buy
                  </span>
                </div>
              </div>

              {/* Start Trial Button */}
              <button
                onClick={startTrial}
                disabled={isActivating}
                className="w-full py-3 bg-white border-2 border-violet-600 text-violet-600 rounded-lg font-semibold hover:bg-violet-50 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isActivating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Clock className="w-5 h-5" />
                    Start 14-Day Free Trial
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                No credit card required. Full access to {selectedPlan.name} features.
              </p>

              {/* Back Button */}
              <button
                onClick={() => {
                  setShowCouponModal(false);
                  setSelectedPlan(null);
                  setCouponCode('');
                  setValidation(null);
                  setError(null);
                }}
                className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                ← Back to plans
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
