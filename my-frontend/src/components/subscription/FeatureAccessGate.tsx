'use client';

/**
 * BISMAN ERP - Feature Access Gate Component
 * 
 * Client-facing component that controls feature access visibility.
 * 
 * KEY PRINCIPLE:
 * - Clients NEVER see "Soft Lock" or "Hard Lock" terminology
 * - They only see: "Allowed" or "Restricted"
 * - Restricted features show appropriate unlock/upgrade options
 * 
 * For Soft Lock: Shows unlock price option
 * For Hard Lock: Shows "Only available with [Plan Name]" upgrade message
 * 
 * @component FeatureAccessGate
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Unlock,
  X,
  Crown,
  CreditCard,
  ArrowUpRight,
  AlertCircle,
  Check,
  Sparkles,
} from 'lucide-react';
import Button from '@/components/ui/Button';

// ============================================================================
// TYPES
// ============================================================================

export type FeatureAccessStatus = 'allowed' | 'restricted';
export type RestrictionType = 'unlockable' | 'upgrade_required';

export interface FeatureAccessInfo {
  featureKey: string;
  featureName: string;
  description?: string;
  status: FeatureAccessStatus;
  restrictionType?: RestrictionType; // Only set if restricted
  unlockPrice?: number; // For soft-locked (unlockable) features
  currency?: string;
  requiredPlanName?: string; // For hard-locked features (e.g., "Enterprise")
  requiredPlanCode?: string;
  currentPlanName?: string;
}

interface FeatureAccessContextType {
  checkAccess: (featureKey: string) => Promise<FeatureAccessInfo>;
  showRestrictionModal: (info: FeatureAccessInfo) => void;
  hideModal: () => void;
  isModalVisible: boolean;
}

// ============================================================================
// CONTEXT
// ============================================================================

const FeatureAccessContext = createContext<FeatureAccessContextType | null>(null);

export function useFeatureAccess() {
  const context = useContext(FeatureAccessContext);
  if (!context) {
    throw new Error('useFeatureAccess must be used within FeatureAccessProvider');
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

export function FeatureAccessProvider({ children }: { children: React.ReactNode }) {
  const [modalData, setModalData] = useState<FeatureAccessInfo | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const checkAccess = useCallback(async (featureKey: string): Promise<FeatureAccessInfo> => {
    try {
      const response = await fetch(`/api/micro-unlock/feature-access/${featureKey}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to check feature access');
      }
      
      const data = await response.json();
      
      return {
        featureKey,
        featureName: data.feature_name || featureKey,
        description: data.description,
        status: data.is_allowed ? 'allowed' : 'restricted',
        restrictionType: data.restriction_type === 'unlockable' ? 'unlockable' : 'upgrade_required',
        unlockPrice: data.unlock_price,
        currency: data.currency || 'INR',
        requiredPlanName: data.required_plan_name,
        requiredPlanCode: data.required_plan_code,
        currentPlanName: data.current_plan_name,
      };
    } catch (error) {
      console.error('Feature access check failed:', error);
      // Default to restricted if check fails
      return {
        featureKey,
        featureName: featureKey,
        status: 'restricted',
        restrictionType: 'upgrade_required',
      };
    }
  }, []);

  const showRestrictionModal = useCallback((info: FeatureAccessInfo) => {
    setModalData(info);
    setIsModalVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    setIsModalVisible(false);
    setTimeout(() => setModalData(null), 300);
  }, []);

  return (
    <FeatureAccessContext.Provider value={{ checkAccess, showRestrictionModal, hideModal, isModalVisible }}>
      {children}
      <AnimatePresence>
        {isModalVisible && modalData && (
          <FeatureRestrictionModal data={modalData} onClose={hideModal} />
        )}
      </AnimatePresence>
    </FeatureAccessContext.Provider>
  );
}

// ============================================================================
// FEATURE RESTRICTION MODAL
// ============================================================================

function FeatureRestrictionModal({
  data,
  onClose,
}: {
  data: FeatureAccessInfo;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUnlockable = data.restrictionType === 'unlockable';

  const handleUnlock = async () => {
    if (!isUnlockable) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/micro-unlock/unlock/${data.featureKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      const result = await response.json();
      
      if (result.ok) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 2000);
      } else {
        setError(result.message || 'Failed to unlock feature');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    // Navigate to pricing/upgrade page
    window.location.href = '/pricing';
  };

  const formatPrice = (price: number, currency: string = 'INR') => {
    if (currency === 'INR') return `₹${price.toLocaleString('en-IN')}`;
    return `${currency} ${price}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className={`p-6 ${
          isUnlockable 
            ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
            : 'bg-gradient-to-r from-purple-600 to-indigo-600'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                {isUnlockable ? (
                  <Lock className="w-6 h-6 text-white" />
                ) : (
                  <Crown className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="text-white">
                <h3 className="text-lg font-semibold">
                  {isUnlockable ? 'Feature Restricted' : 'Premium Feature'}
                </h3>
                <p className="text-white/90 text-sm">{data.featureName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            /* Success State */
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Feature Unlocked!
              </h4>
              <p className="text-gray-500 text-sm">
                You now have access to {data.featureName}
              </p>
            </div>
          ) : (
            <>
              {/* Description */}
              {data.description && (
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                  {data.description}
                </p>
              )}

              {isUnlockable ? (
                /* Soft Lock - Unlockable with payment */
                <>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-5 mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Sparkles className="w-5 h-5 text-amber-600" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        Unlock this feature
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-3xl font-bold text-amber-600">
                        {formatPrice(data.unlockPrice || 0, data.currency)}
                      </span>
                      <span className="text-gray-500 text-sm">/month</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Get instant access to this feature. Billed with your subscription.
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={onClose}
                      variant="outline"
                      className="flex-1"
                      disabled={loading}
                    >
                      Maybe Later
                    </Button>
                    <Button
                      onClick={handleUnlock}
                      className="flex-1 bg-amber-500 hover:bg-amber-600"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Unlocking...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Unlock className="w-4 h-4" />
                          Unlock Now
                        </span>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                /* Hard Lock - Upgrade required */
                <>
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-5 mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Crown className="w-5 h-5 text-purple-600" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        Premium Feature
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                      This feature is only available with the{' '}
                      <span className="font-semibold text-purple-600">
                        {data.requiredPlanName || 'Premium'}
                      </span>{' '}
                      plan.
                    </p>
                    {data.currentPlanName && (
                      <p className="text-sm text-gray-500">
                        Your current plan: <span className="font-medium">{data.currentPlanName}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={onClose}
                      variant="outline"
                      className="flex-1"
                    >
                      Maybe Later
                    </Button>
                    <Button
                      onClick={handleUpgrade}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      <span className="flex items-center gap-2">
                        Upgrade to {data.requiredPlanName || 'Premium'}
                        <ArrowUpRight className="w-4 h-4" />
                      </span>
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// FEATURE ACCESS GATE COMPONENT
// ============================================================================

interface FeatureAccessGateProps {
  featureKey: string;
  featureName?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showBadge?: boolean;
}

/**
 * Wraps content and controls access based on feature subscription status.
 * 
 * Usage:
 * <FeatureAccessGate featureKey="ai_analytics" featureName="AI Analytics">
 *   <AIAnalyticsDashboard />
 * </FeatureAccessGate>
 */
export function FeatureAccessGate({
  featureKey,
  featureName,
  children,
  fallback,
  showBadge = true,
}: FeatureAccessGateProps) {
  const [accessInfo, setAccessInfo] = React.useState<FeatureAccessInfo | null>(null);
  const [checking, setChecking] = React.useState(true);
  const { checkAccess, showRestrictionModal } = useFeatureAccess();

  React.useEffect(() => {
    let mounted = true;
    
    checkAccess(featureKey).then((info) => {
      if (mounted) {
        setAccessInfo(info);
        setChecking(false);
      }
    });

    return () => { mounted = false; };
  }, [featureKey, checkAccess]);

  if (checking) {
    return (
      <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg h-20" />
    );
  }

  if (!accessInfo) {
    return fallback || null;
  }

  if (accessInfo.status === 'allowed') {
    return <>{children}</>;
  }

  // Restricted - show locked state
  const handleClick = () => {
    showRestrictionModal({
      ...accessInfo,
      featureName: featureName || accessInfo.featureName,
    });
  };

  if (fallback) {
    return (
      <div onClick={handleClick} className="cursor-pointer">
        {fallback}
      </div>
    );
  }

  // Default restricted UI
  return (
    <div
      onClick={handleClick}
      className="relative cursor-pointer group"
    >
      {/* Blurred/disabled content preview */}
      <div className="opacity-50 pointer-events-none blur-[1px]">
        {children}
      </div>
      
      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 dark:bg-gray-900/30 rounded-lg backdrop-blur-[2px]">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg px-6 py-4 text-center transform group-hover:scale-105 transition-transform">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
            accessInfo.restrictionType === 'unlockable'
              ? 'bg-amber-100 dark:bg-amber-900/30'
              : 'bg-purple-100 dark:bg-purple-900/30'
          }`}>
            {accessInfo.restrictionType === 'unlockable' ? (
              <Lock className="w-6 h-6 text-amber-600" />
            ) : (
              <Crown className="w-6 h-6 text-purple-600" />
            )}
          </div>
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {featureName || accessInfo.featureName}
          </p>
          <p className="text-sm text-gray-500">
            {accessInfo.restrictionType === 'unlockable'
              ? 'Click to unlock'
              : `Available with ${accessInfo.requiredPlanName || 'Premium'}`
            }
          </p>
        </div>
      </div>

      {/* Badge */}
      {showBadge && (
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
          accessInfo.restrictionType === 'unlockable'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-purple-100 text-purple-700'
        }`}>
          {accessInfo.restrictionType === 'unlockable' ? 'Unlock' : 'Upgrade'}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SIMPLE ACCESS BADGE
// ============================================================================

interface FeatureStatusBadgeProps {
  status: FeatureAccessStatus;
  restrictionType?: RestrictionType;
  size?: 'sm' | 'md';
}

/**
 * Simple badge showing Allowed / Restricted status
 */
export function FeatureStatusBadge({ 
  status, 
  restrictionType,
  size = 'md' 
}: FeatureStatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  
  if (status === 'allowed') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 ${sizeClasses}`}>
        <Check className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        Allowed
      </span>
    );
  }

  if (restrictionType === 'unlockable') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 ${sizeClasses}`}>
        <Lock className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        Restricted
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-700 ${sizeClasses}`}>
      <Crown className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      Premium Only
    </span>
  );
}

export default FeatureAccessGate;
