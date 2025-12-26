'use client';

/**
 * BISMAN ERP - Micro-Unlock Prompt Component
 * 
 * Global component to show unlock prompts when users hit feature limits.
 * This can be triggered from anywhere in the app via context or events.
 * 
 * CRITICAL UX RULES:
 * - Users NEVER see pricing or payment prompts
 * - Users only see: "Usage limit reached. Contact your administrator."
 * - Admins see unlock options with pricing
 * 
 * @component UnlockPrompt
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Unlock,
  X,
  Check,
  Clock,
  AlertCircle,
  Info,
  CreditCard,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';
import Button from '@/components/ui/Button';

// ============================================================================
// TYPES
// ============================================================================

interface UnlockPromptData {
  featureKey: string;
  featureName: string;
  description?: string;
  currentUsage: number;
  usageLimit: number;
  resetInSeconds: number;
  unlockPrice: number;
  currency?: string;
  isAdmin?: boolean; // NEW: Role awareness
}

interface UnlockPromptContextType {
  showPrompt: (data: UnlockPromptData) => void;
  hidePrompt: () => void;
  isVisible: boolean;
}

// ============================================================================
// CONTEXT
// ============================================================================

const UnlockPromptContext = createContext<UnlockPromptContextType | null>(null);

export function useUnlockPrompt() {
  const context = useContext(UnlockPromptContext);
  if (!context) {
    throw new Error('useUnlockPrompt must be used within UnlockPromptProvider');
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

export function UnlockPromptProvider({ children }: { children: React.ReactNode }) {
  const [promptData, setPromptData] = useState<UnlockPromptData | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const showPrompt = useCallback((data: UnlockPromptData) => {
    setPromptData(data);
    setIsVisible(true);
  }, []);

  const hidePrompt = useCallback(() => {
    setIsVisible(false);
    // Keep data for exit animation
    setTimeout(() => setPromptData(null), 300);
  }, []);

  return (
    <UnlockPromptContext.Provider value={{ showPrompt, hidePrompt, isVisible }}>
      {children}
      <AnimatePresence>
        {isVisible && promptData && (
          promptData.isAdmin ? (
            <AdminUnlockModal data={promptData} onClose={hidePrompt} />
          ) : (
            <UserLimitModal data={promptData} onClose={hidePrompt} />
          )
        )}
      </AnimatePresence>
    </UnlockPromptContext.Provider>
  );
}

// ============================================================================
// USER MODAL (NO PRICING - Contact Admin)
// ============================================================================

function UserLimitModal({ 
  data, 
  onClose 
}: { 
  data: UnlockPromptData; 
  onClose: () => void;
}) {
  const formatResetTime = (seconds: number): string => {
    if (!seconds || seconds <= 0) return 'soon';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 24) return `${Math.floor(hours / 24)} days`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes} minutes`;
    return 'less than a minute';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        {/* Header - Neutral color, not alarming */}
        <div className="bg-gradient-to-r from-gray-600 to-gray-700 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="text-white">
                <h3 className="text-lg font-semibold">Usage Limit Reached</h3>
                <p className="text-white/90 text-sm">{data.featureName}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content - NO PRICING */}
        <div className="p-6">
          {/* Simple message */}
          <div className="text-center mb-6">
            <p className="text-gray-900 dark:text-gray-100 font-medium mb-2">
              Your usage limit for today is reached.
            </p>
            <p className="text-gray-500 text-sm">
              Contact your administrator for additional access.
            </p>
          </div>

          {/* Reset info */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                Limit resets in {formatResetTime(data.resetInSeconds)}
              </span>
            </div>
          </div>

          {/* Contact Admin hint */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-6">
            <MessageCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium">Need more access?</p>
              <p className="text-blue-600 dark:text-blue-400">
                Your administrator can unlock this feature for your team.
              </p>
            </div>
          </div>

          {/* Single OK button */}
          <Button 
            onClick={onClose} 
            className="w-full"
            variant="outline"
          >
            OK
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// ADMIN MODAL (WITH PRICING)
// ============================================================================

function AdminUnlockModal({ 
  data, 
  onClose 
}: { 
  data: UnlockPromptData; 
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [spendError, setSpendError] = useState<string | null>(null);

  const handleUnlock = async () => {
    setLoading(true);
    setSpendError(null);
    try {
      const response = await fetch(`/api/micro-unlock/unlock/${data.featureKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ autoRenew: true }),
      });
      const result = await response.json();
      
      if (result.ok) {
        setSuccess(true);
        // Auto-close after success
        setTimeout(() => {
          onClose();
          // Refresh the current page to update limits
          window.location.reload();
        }, 2000);
      } else if (result.error === 'SPEND_LIMIT_EXCEEDED') {
        setSpendError(result.message || 'Monthly spend limit reached. Increase limit to unlock more services.');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to unlock:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatResetTime = (seconds: number): string => {
    if (!seconds || seconds <= 0) return 'soon';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 24) return `${Math.floor(hours / 24)} days`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes} minutes`;
    return 'less than a minute';
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </motion.div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Feature Unlocked!
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {data.featureName} is now unlimited. Enjoy!
          </p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header - Orange/Yellow gradient for attention without alarm */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="text-white">
                <h3 className="text-lg font-semibold">Limit Reached</h3>
                <p className="text-white/90 text-sm">{data.featureName}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Usage indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">Today's Usage</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {data.currentUsage} / {data.usageLimit}
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-red-500 rounded-full"
                style={{ width: '100%' }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Resets in {formatResetTime(data.resetInSeconds)}
            </p>
          </div>

          {/* Unlock offer */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-5 mb-6">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Unlock Unlimited Access
              </p>
              <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                ₹{data.unlockPrice}
                <span className="text-lg font-normal text-gray-500">/month</span>
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>No more daily limits</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Service starts immediately</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>First billing after 30 days</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Spend Limit Error */}
          {spendError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-800 dark:text-red-200">
                  Monthly spend limit reached
                </p>
                <p className="text-red-600 dark:text-red-300 text-xs mt-1">
                  {spendError}
                </p>
              </div>
            </div>
          )}

          {/* Info box */}
          <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg mb-6">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Your existing data and progress are safe. You can continue using the feature 
              after the reset, or unlock now for unlimited access.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1 order-2 sm:order-1"
          >
            Decide Later
          </Button>
          <Button 
            onClick={handleUnlock}
            disabled={loading || !!spendError}
            className="flex-1 order-1 sm:order-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Unlocking...
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4 mr-2" />
                Unlock Service — ₹{data.unlockPrice}/mo
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// TOAST NOTIFICATION (for less intrusive prompts)
// ============================================================================

interface ToastPromptProps {
  featureName: string;
  unlockPrice: number;
  onUnlock: () => void;
  onDismiss: () => void;
}

export function UnlockToast({ 
  featureName, 
  unlockPrice, 
  onUnlock, 
  onDismiss 
}: ToastPromptProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: 50, x: '-50%' }}
      className="fixed bottom-6 left-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4 z-50 max-w-lg"
    >
      <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900 dark:text-gray-100">
          Daily limit reached for {featureName}
        </p>
        <p className="text-sm text-gray-500">
          Unlock unlimited for ₹{unlockPrice}/month
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Later
        </Button>
        <Button size="sm" onClick={onUnlock}>
          <Unlock className="w-3 h-3 mr-1" />
          Unlock
        </Button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// HOOK FOR INTERCEPTING API ERRORS
// ============================================================================

/**
 * Hook to intercept 429 responses and show unlock prompts
 * 
 * Usage:
 * ```
 * const { fetchWithUnlockPrompt } = useUnlockInterceptor();
 * const result = await fetchWithUnlockPrompt('/api/tasks', { method: 'POST', body: ... });
 * ```
 */
export function useUnlockInterceptor() {
  const { showPrompt } = useUnlockPrompt();

  const fetchWithUnlockPrompt = useCallback(async (
    url: string,
    options: RequestInit = {}
  ) => {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
    });

    // Check if it's a rate limit response
    if (response.status === 429) {
      const data = await response.json();
      
      // If it has unlock prompt data, show the modal
      if (data.unlockPrompt) {
        showPrompt({
          featureKey: data.featureKey,
          featureName: data.unlockPrompt.title.replace("You've reached today's limit for ", ''),
          currentUsage: data.unlockPrompt.currentUsage,
          usageLimit: data.unlockPrompt.usageLimit,
          resetInSeconds: data.unlockPrompt.resetInSeconds,
          unlockPrice: data.unlockPrompt.price,
        });
      }

      throw new Error(data.message || 'Rate limit exceeded');
    }

    return response;
  }, [showPrompt]);

  return { fetchWithUnlockPrompt };
}

// ============================================================================
// INLINE LIMIT WARNING COMPONENT
// ============================================================================

interface LimitWarningProps {
  featureName: string;
  currentUsage: number;
  usageLimit: number;
  unlockPrice: number;
  onUnlock?: () => void;
}

export function InlineLimitWarning({
  featureName,
  currentUsage,
  usageLimit,
  unlockPrice,
  onUnlock,
}: LimitWarningProps) {
  const percentage = (currentUsage / usageLimit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = currentUsage >= usageLimit;

  if (!isNearLimit) return null;

  return (
    <div className={`
      rounded-lg p-3 flex items-center justify-between
      ${isAtLimit 
        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
        : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
      }
    `}>
      <div className="flex items-center gap-3">
        {isAtLimit ? (
          <AlertCircle className="w-5 h-5 text-red-500" />
        ) : (
          <AlertCircle className="w-5 h-5 text-yellow-500" />
        )}
        <div>
          <p className={`text-sm font-medium ${isAtLimit ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
            {isAtLimit 
              ? `${featureName} limit reached` 
              : `${usageLimit - currentUsage} ${featureName.toLowerCase()} remaining today`
            }
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {currentUsage}/{usageLimit} used
          </p>
        </div>
      </div>
      {onUnlock && (
        <Button 
          size="sm" 
          variant={isAtLimit ? 'default' : 'outline'}
          onClick={onUnlock}
        >
          Unlock ₹{unlockPrice}/mo
        </Button>
      )}
    </div>
  );
}

export default UnlockPromptProvider;
