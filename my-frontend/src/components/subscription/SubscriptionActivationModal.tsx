'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket,
  Sparkles,
  CheckCircle,
  XCircle,
  Loader2,
  Crown,
  Gift,
  ArrowRight,
  Clock,
  Shield,
  Zap,
  Star,
  X,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

interface SubscriptionActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated: () => void;
  trialDays?: number;
}

interface CouponValidation {
  valid: boolean;
  plan?: {
    id: number;
    name: string;
    tier: string;
    plan_code: string;
  };
  durationDays?: number;
  validUntil?: string;
  message?: string;
}

export default function SubscriptionActivationModal({
  isOpen,
  onClose,
  onActivated,
  trialDays = 14,
}: SubscriptionActivationModalProps) {
  const [couponCode, setCouponCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [validation, setValidation] = useState<CouponValidation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activatedPlan, setActivatedPlan] = useState<string | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [brandData, setBrandData] = useState<{ displayName: string; logoUrl: string | null }>({
    displayName: '',
    logoUrl: null,
  });

  // Load brand data from session storage
  useEffect(() => {
    if (isOpen) {
      const storedName = sessionStorage.getItem('workspace_display_name');
      const storedLogo = sessionStorage.getItem('workspace_logo_url');
      if (storedName) {
        setBrandData({
          displayName: storedName,
          logoUrl: storedLogo,
        });
      }
    }
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCouponCode('');
      setValidation(null);
      setError(null);
      setShowSuccess(false);
    }
  }, [isOpen]);

  // Format coupon code as user types (uppercase, dashes)
  const handleCouponChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setCouponCode(value);
    setValidation(null);
    setError(null);
  };

  // Validate coupon code
  const handleValidate = async () => {
    if (!couponCode.trim()) {
      setError('Please enter a coupon code');
      return;
    }

    setIsValidating(true);
    setError(null);
    setValidation(null);

    try {
      const response = await fetch(`${API_BASE}/api/subscriptions/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: couponCode.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setValidation({
          valid: true,
          plan: data.plan,
          durationDays: data.durationDays,
          validUntil: data.validUntil,
          message: data.message,
        });
      } else {
        setValidation({ valid: false });
        const errorMessage = data.message || 'Invalid coupon code';
        setError(errorMessage);
        // Check if user already has an active subscription
        if (errorMessage.toLowerCase().includes('already have an active subscription')) {
          setHasActiveSubscription(true);
        }
      }
    } catch (err) {
      console.error('Validation error:', err);
      setError('Failed to validate coupon. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  // Redeem coupon
  const handleRedeem = async () => {
    if (!validation?.valid || !validation.plan) return;

    setIsRedeeming(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/subscriptions/redeem-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: couponCode.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setActivatedPlan(validation.plan.name);
        setShowSuccess(true);
        
        // Wait for success animation then close
        setTimeout(() => {
          onActivated();
          onClose();
        }, 3000);
      } else {
        setError(data.message || 'Failed to redeem coupon');
      }
    } catch (err) {
      console.error('Redemption error:', err);
      setError('Failed to redeem coupon. Please try again.');
    } finally {
      setIsRedeeming(false);
    }
  };

  // Start trial
  const handleStartTrial = async () => {
    setIsRedeeming(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/subscriptions/start-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setActivatedPlan(`${trialDays}-day Trial`);
        setShowSuccess(true);
        
        setTimeout(() => {
          onActivated();
          onClose();
        }, 3000);
      } else {
        setError(data.message || 'Failed to start trial');
      }
    } catch (err) {
      console.error('Trial error:', err);
      setError('Failed to start trial. Please try again.');
    } finally {
      setIsRedeeming(false);
    }
  };

  // Handle close - just close without starting trial
  // Parent component will track dismissal and show again after 5 minutes
  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && !showSuccess && handleClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md mx-4"
        >
          {/* Success State */}
          {showSuccess ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl p-8 text-white text-center shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-24 h-24 mx-auto mb-6 bg-white/20 rounded-full flex items-center justify-center"
              >
                <CheckCircle className="w-14 h-14 text-white" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold mb-2"
              >
                🎉 Subscription Activated!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-white/90 text-lg"
              >
                {activatedPlan} is now active
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-6 flex items-center justify-center gap-2 text-white/80"
              >
                <Sparkles className="w-5 h-5" />
                <span>Redirecting to your dashboard...</span>
              </motion.div>
            </motion.div>
          ) : (
            /* Main Modal Content */
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
              {/* Header with client branding */}
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-6 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="relative">
                  {/* Client Logo & Name */}
                  <div className="flex items-center gap-4 mb-4">
                    {brandData.logoUrl ? (
                      <div className="w-14 h-14 rounded-xl bg-white p-1.5 shadow-lg">
                        <img
                          src={brandData.logoUrl}
                          alt={brandData.displayName}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                        <Crown className="w-7 h-7" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-bold">
                        {brandData.displayName || 'Welcome!'}
                      </h2>
                      <p className="text-white/80 text-sm">
                        Activate your subscription
                      </p>
                    </div>
                  </div>
                  <p className="text-white/90 text-sm">
                    Enter a coupon code to activate your plan, or start with a free trial
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Coupon Input Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Ticket className="w-5 h-5 text-amber-500" />
                    <span className="font-medium">Have a coupon code?</span>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={handleCouponChange}
                        placeholder="BIS-XXXX-XX-XXXXXXXX"
                        className={`w-full px-4 py-3 rounded-xl border-2 font-mono text-lg tracking-wider uppercase transition-all ${
                          validation?.valid
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : validation?.valid === false
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-200 dark:border-gray-700 focus:border-amber-500'
                        } dark:bg-gray-800 focus:outline-none`}
                        disabled={isValidating || isRedeeming}
                      />
                      {validation?.valid && (
                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-500" />
                      )}
                      {validation?.valid === false && (
                        <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-red-500" />
                      )}
                    </div>
                    <button
                      onClick={handleValidate}
                      disabled={!couponCode.trim() || isValidating || isRedeeming}
                      className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {isValidating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Shield className="w-5 h-5" />
                          Verify
                        </>
                      )}
                    </button>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg"
                    >
                      <XCircle className="w-5 h-5 flex-shrink-0" />
                      {error}
                    </motion.div>
                  )}

                  {/* Validated Coupon Info */}
                  {validation?.valid && validation.plan && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-500 rounded-lg">
                          <Crown className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-emerald-800 dark:text-emerald-300">
                            {validation.plan.name}
                          </h4>
                          <p className="text-sm text-emerald-600 dark:text-emerald-400">
                            {validation.durationDays} days subscription
                          </p>
                          {validation.validUntil && (
                            <p className="text-xs text-emerald-500 mt-1">
                              Valid until {new Date(validation.validUntil).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={handleRedeem}
                          disabled={isRedeeming}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                          {isRedeeming ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              Activate
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Divider - only show if no active subscription */}
                {!hasActiveSubscription && (
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">or</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                )}

                {/* Trial Section - only show if no active subscription */}
                {!hasActiveSubscription && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          Start Free Trial
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {trialDays} days full access, no credit card required
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleStartTrial}
                      disabled={isRedeeming || isValidating}
                      className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {isRedeeming ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Clock className="w-4 h-4" />
                          Start Trial
                        </>
                      )}
                    </button>
                  </div>

                  {/* Trial Features */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {['All Features Included', 'Unlimited Users', 'Full Support', 'No Credit Card'].map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Star className="w-4 h-4 text-blue-500" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
