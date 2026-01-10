'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  TrendingUp, 
  Calendar, 
  CheckCircle, 
  AlertCircle,
  Download,
  Clock,
  DollarSign,
  Users,
  Database,
  Zap,
  Shield,
  Star,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  Activity,
  Award,
  Crown,
  Sparkles,
  BarChart3,
  HardDrive,
  Layers,
  ListChecks,
  UserCheck,
  UserX,
  Wallet,
  Globe,
  UserPlus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { CreateFullUserModal } from '@/components/user-management';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';

// Currency configuration
const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

// Feature categories for better organization
const FEATURE_CATEGORIES = {
  core: { label: 'Core Features', icon: Zap, color: 'from-blue-500 to-cyan-500' },
  security: { label: 'Security & Compliance', icon: Shield, color: 'from-green-500 to-emerald-500' },
  analytics: { label: 'Analytics & Reports', icon: BarChart3, color: 'from-purple-500 to-pink-500' },
  storage: { label: 'Storage & Limits', icon: Database, color: 'from-orange-500 to-red-500' },
};

interface SubscriptionData {
  ok?: boolean;
  has_subscription?: boolean;
  subscription?: {
    id: string;
    state: string;
    start_date?: string;
    end_date?: string;
    is_active?: boolean;
    plan: {
      code: string;
      name: string;
      price_monthly: number;
      price_yearly: number;
    };
    billing_cycle: string;
    current_period_end: string;
    next_billing_date: string;
    trial_end_date?: string;
    trial_converted?: boolean;
    usage: {
      users: {
        current: number;
        limit: number;
      };
      storage: {
        current_bytes: number;
        limit_gb: number;
      };
    };
    scheduled_change?: {
      new_plan: string;
      effective_date: string;
      type: string;
    } | null;
  } | null;
  // Legacy format support
  plan?: {
    id: string;
    name: string;
    display_name: string;
    base_price: number;
    currency: string;
    billing_cycle: string;
    features: Record<string, boolean | number | string>;
    limits: Record<string, number | string>;
  } | null;
  usage?: {
    users: number;
    storage_mb: number;
    api_calls: number;
    tasks_completed?: number;
    amount_processed?: number;
  } | null;
  billing_history?: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    description: string;
  }>;
}

interface TenantData {
  id: string;
  name: string;
  slug: string;
  settings?: Record<string, unknown>;
}

interface AvailablePlan {
  id: number;
  plan_code: string;
  name: string;
  description?: string;
  price_monthly: number;
  price_yearly: number;
  max_users: number;
  max_storage_gb: number;
  max_branches: number;
  is_active: boolean;
  is_popular?: boolean;
}

interface UserRole {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  is_active: boolean;
  created_at: string;
}

interface ExchangeRates {
  [key: string]: number;
}

const BillingPage = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [users, setUsers] = useState<UserRole[]>([]);
  const [analyticsData, setAnalyticsData] = useState<Record<string, unknown> | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState('INR');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});
  const [ratesLoading, setRatesLoading] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [showBillingHistory, setShowBillingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<AvailablePlan[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
  const [featuresData, setFeaturesData] = useState<Record<string, unknown> | null>(null);

  // Subscription limits for user creation
  const { 
    canCreateUser,
    refresh: refreshSubscription,
  } = useSubscriptionLimits();

  // Handle upgrade plan - show modal with available plans
  const handleUpgradePlan = () => {
    setShowUpgradeModal(true);
  };

  // Handle plan upgrade submission
  const handleConfirmUpgrade = async () => {
    if (!selectedPlanCode) {
      toast({ title: 'Please select a plan', variant: 'destructive' });
      return;
    }

    setUpgrading(true);
    try {
      const response = await api.post('/api/subscriptions/upgrade', {
        plan_code: selectedPlanCode,
        billing_cycle: 'MONTHLY',
      });

      if (response.data?.ok) {
        toast({ title: 'Plan upgraded successfully!', variant: 'success' });
        setShowUpgradeModal(false);
        setSelectedPlanCode(null);
        await fetchData();
        refreshSubscription();
      } else {
        toast({ title: response.data?.error || 'Failed to upgrade plan', variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('Upgrade error:', error);
      toast({ 
        title: error.response?.data?.error || 'Failed to upgrade plan', 
        variant: 'destructive' 
      });
    } finally {
      setUpgrading(false);
    }
  };

  // Fetch exchange rates from real API
  const fetchExchangeRates = useCallback(async () => {
    setRatesLoading(true);
    try {
      // Using exchangerate-api.com free tier
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
      const data = await response.json();
      if (data && data.rates) {
        setExchangeRates(data.rates);
      }
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
      // Fallback rates if API fails
      setExchangeRates({
        INR: 1,
        USD: 0.012,
        EUR: 0.011,
        GBP: 0.0095,
        AED: 0.044,
        AUD: 0.018,
        CAD: 0.016,
        SGD: 0.016,
        JPY: 1.79,
      });
    } finally {
      setRatesLoading(false);
    }
  }, []);

  // Convert currency using real exchange rates
  const convertCurrency = useCallback((amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;
    
    // All rates are relative to INR (base currency from API)
    const fromRate = exchangeRates[fromCurrency] || 1;
    const toRate = exchangeRates[toCurrency] || 1;
    
    // Convert: amount in fromCurrency → INR → toCurrency
    const amountInINR = fromCurrency === 'INR' ? amount : amount / fromRate;
    const convertedAmount = toCurrency === 'INR' ? amountInINR : amountInINR * toRate;
    
    return convertedAmount;
  }, [exchangeRates]);

  // Format currency with proper symbol
  const formatCurrency = useCallback((amount: number, currencyCode: string = selectedCurrency): string => {
    const currency = CURRENCIES.find(c => c.code === currencyCode);
    const symbol = currency?.symbol || '₹';
    
    // Handle JPY differently (no decimals)
    if (currencyCode === 'JPY') {
      return `${symbol}${Math.round(amount).toLocaleString()}`;
    }
    
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [selectedCurrency]);

  // Get display price in selected currency
  const getDisplayPrice = useCallback((priceInINR: number): string => {
    const converted = convertCurrency(priceInINR, 'INR', selectedCurrency);
    return formatCurrency(converted, selectedCurrency);
  }, [convertCurrency, formatCurrency, selectedCurrency]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Use skipGlobalError to prevent toast spam - these endpoints may return 400/404
      // for users without tenant context, which is expected behavior
      const [subResponse, usersResponse, analyticsResponse, featuresResponse, plansResponse] = await Promise.allSettled([
        api.get('/api/subscriptions/current', { skipGlobalError: true } as any),
        api.get('/api/users', { skipGlobalError: true } as any),
        api.get('/api/analytics/summary', { skipGlobalError: true } as any),
        api.get('/api/subscriptions/features', { skipGlobalError: true } as any),
        api.get('/api/subscriptions/plans', { skipGlobalError: true } as any),
      ]);

      if (subResponse.status === 'fulfilled') {
        setSubscriptionData(subResponse.value.data);
        // Also set tenant data from subscription response if available
        if (subResponse.value.data?.client) {
          setTenantData(subResponse.value.data.client);
        }
      }
      if (usersResponse.status === 'fulfilled') {
        setUsers(usersResponse.value.data?.users || usersResponse.value.data || []);
      }
      if (analyticsResponse.status === 'fulfilled') {
        setAnalyticsData(analyticsResponse.value.data);
      }
      if (featuresResponse.status === 'fulfilled') {
        setFeaturesData(featuresResponse.value.data);
      }
      if (plansResponse.status === 'fulfilled') {
        const plans = plansResponse.value.data?.plans || plansResponse.value.data?.data || [];
        // Filter by is_active if present, otherwise assume all returned plans are active
        setAvailablePlans(plans.filter((p: AvailablePlan) => p.is_active !== false));
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast({ title: 'Failed to load billing information', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchData();
    fetchExchangeRates();
  }, [fetchData, fetchExchangeRates]);

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchExchangeRates()]);
    setRefreshing(false);
    toast({ title: 'Data refreshed', variant: 'success' });
  };

  // Calculate role usage stats
  const roleStats = useMemo(() => {
    const activeUsers = users.filter(u => u.is_active);
    const pendingUsers = users.filter(u => !u.is_active || u.status === 'pending');
    
    const roleBreakdown: Record<string, { active: number; pending: number }> = {};
    users.forEach(user => {
      const role = user.role || 'Unknown';
      if (!roleBreakdown[role]) {
        roleBreakdown[role] = { active: 0, pending: 0 };
      }
      if (user.is_active && user.status !== 'pending') {
        roleBreakdown[role].active++;
      } else {
        roleBreakdown[role].pending++;
      }
    });

    return {
      total: users.length,
      active: activeUsers.length,
      pending: pendingUsers.length,
      breakdown: roleBreakdown,
    };
  }, [users]);

  // Calculate usage statistics - handles both new and legacy API response formats
  const usageStats = useMemo(() => {
    // New API format from /api/subscriptions/current
    const sub = subscriptionData?.subscription;
    const subUsage = sub?.usage;
    
    // Legacy format support
    const legacyUsage = subscriptionData?.usage;
    const legacyLimits = subscriptionData?.plan?.limits;
    
    // Features data from /api/subscriptions/features
    const featureLimits = (featuresData as Record<string, unknown>)?.limits as Record<string, number> | undefined;
    const featureUsage = (featuresData as Record<string, unknown>)?.usage as Record<string, number> | undefined;
    
    // Determine user limits (priority: new API > features > legacy > default)
    const userLimit = subUsage?.users?.limit || 
                      featureLimits?.max_users || 
                      Number(legacyLimits?.max_users) || 
                      100;
    const userCurrent = subUsage?.users?.current || 
                        featureUsage?.current_users ||
                        roleStats.total;
    
    // Storage limits
    const storageLimitGb = subUsage?.storage?.limit_gb || 
                           featureLimits?.max_storage_gb ||
                           Number(legacyLimits?.storage_gb) || 
                           10;
    const storageUsedBytes = subUsage?.storage?.current_bytes || 0;
    const storageUsedMb = legacyUsage?.storage_mb || (storageUsedBytes / (1024 * 1024));
    
    return {
      users: {
        used: userCurrent,
        limit: userLimit === -1 ? 999 : userLimit, // -1 means unlimited
        percentage: userLimit === -1 ? 0 : Math.min(100, (userCurrent / userLimit) * 100),
      },
      storage: {
        used: storageUsedMb,
        limit: storageLimitGb * 1024, // Convert GB to MB
        percentage: storageLimitGb === -1 ? 0 : Math.min(100, (storageUsedMb / (storageLimitGb * 1024)) * 100),
      },
      tasks: {
        completed: legacyUsage?.tasks_completed || (analyticsData as Record<string, number>)?.tasks_completed || 0,
      },
      amount: {
        processed: legacyUsage?.amount_processed || (analyticsData as Record<string, number>)?.total_amount_processed || 0,
      },
      api: {
        used: legacyUsage?.api_calls || 0,
        limit: featureLimits?.max_api_calls_day || Number(legacyLimits?.api_calls_per_month) || 100000,
      },
    };
  }, [subscriptionData, roleStats, analyticsData, featuresData]);

  // Get current plan name - handles both new and legacy API formats
  const currentPlanName = useMemo(() => {
    // New API format
    if (subscriptionData?.subscription?.plan?.name) {
      return subscriptionData.subscription.plan.name;
    }
    // Features API format
    if ((featuresData as Record<string, unknown>)?.planName) {
      return (featuresData as Record<string, unknown>).planName as string;
    }
    // Legacy format
    if (subscriptionData?.plan?.name) {
      return subscriptionData.plan.name;
    }
    return 'Free Plan';
  }, [subscriptionData, featuresData]);

  // Get current plan code
  const currentPlanCode = useMemo(() => {
    if (subscriptionData?.subscription?.plan?.code) {
      return subscriptionData.subscription.plan.code;
    }
    if ((featuresData as Record<string, unknown>)?.plan) {
      return (featuresData as Record<string, unknown>).plan as string;
    }
    return null;
  }, [subscriptionData, featuresData]);

  // Get current features - from features API or legacy plan data
  const currentFeatures = useMemo(() => {
    const features = (featuresData as Record<string, unknown>)?.features as Record<string, boolean | number | string> | undefined;
    if (features && Object.keys(features).length > 0) {
      return features;
    }
    return subscriptionData?.plan?.features || {};
  }, [featuresData, subscriptionData]);

  // Get plan tier info for styling
  const getPlanTier = (planName: string | undefined) => {
    const name = (planName || '').toLowerCase();
    if (name.includes('enterprise') || name.includes('premium')) {
      return { icon: Crown, color: 'from-amber-400 to-yellow-600', label: 'Enterprise', bg: 'bg-gradient-to-r from-amber-50 to-yellow-50' };
    }
    if (name.includes('professional') || name.includes('pro')) {
      return { icon: Award, color: 'from-purple-500 to-indigo-600', label: 'Professional', bg: 'bg-gradient-to-r from-purple-50 to-indigo-50' };
    }
    if (name.includes('standard') || name.includes('growth')) {
      return { icon: Star, color: 'from-blue-500 to-cyan-500', label: 'Standard', bg: 'bg-gradient-to-r from-blue-50 to-cyan-50' };
    }
    if (name.includes('trial')) {
      return { icon: Sparkles, color: 'from-green-500 to-emerald-500', label: 'Trial', bg: 'bg-gradient-to-r from-green-50 to-emerald-50' };
    }
    return { icon: Zap, color: 'from-gray-500 to-slate-600', label: 'Basic', bg: 'bg-gradient-to-r from-gray-50 to-slate-50' };
  };

  const planTier = getPlanTier(currentPlanName);
  const PlanIcon = planTier.icon;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header with Plan Sticker */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Title and Description */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Billing & Subscription
              </h1>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-full hover:bg-white/50 transition-colors"
              >
                <RefreshCw className={`w-5 h-5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-slate-600 max-w-2xl">
              Complete transparency into your subscription, usage, and billing. Track your plan features, 
              monitor usage, and manage your subscription with ease.
            </p>
          </div>

          {/* Current Plan Sticker - Prominent Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${planTier.bg} border-2 border-white/50 shadow-xl rounded-2xl p-4 min-w-[280px]`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${planTier.color} flex items-center justify-center shadow-lg`}>
                <PlanIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Current Plan</p>
                <h3 className={`text-lg md:text-xl font-extrabold text-slate-900`}>
                  {currentPlanName}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {subscriptionData?.has_subscription
                    ? 'Your active subscription and billing status.'
                    : 'Basic features included. Upgrade to unlock more.'
                  }
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    {subscriptionData?.subscription?.state || 'Active'}
                  </span>
                  {subscriptionData?.subscription?.current_period_end && (
                    <span className="text-xs text-slate-500">
                      Renews: {new Date(subscriptionData.subscription.current_period_end).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Currency Selector - Sleek Custom Dropdown */}
        <div className="flex items-center gap-4 bg-white/70 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/50">
          <Globe className="w-5 h-5 text-slate-500" />
          <span className="text-sm text-slate-600 font-medium">Display Currency:</span>
          <div className="relative">
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 cursor-pointer hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shadow-sm"
            >
              {CURRENCIES.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.code} - {currency.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          {ratesLoading && <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />}
          {!ratesLoading && exchangeRates.USD && (
            <span className="text-xs text-slate-400 ml-2 bg-slate-100 px-2 py-1 rounded-full">
              Live rates • 1 INR = {exchangeRates.USD?.toFixed(4)} USD
            </span>
          )}
        </div>

        {/* Hero Stats - Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Features Used */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <Layers className="w-8 h-8 opacity-80" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Features</span>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-1">
                {Object.values(currentFeatures).filter(v => v === true).length}
              </div>
              <p className="text-sm opacity-80">Active Features Enabled</p>
            </div>
          </motion.div>

          {/* Storage / Database Usage */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <HardDrive className="w-8 h-8 opacity-80" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Storage</span>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-1">
                {(usageStats.storage.used / 1024).toFixed(2)} GB
              </div>
              <p className="text-sm opacity-80">
                of {(usageStats.storage.limit / 1024).toFixed(0)} GB used
              </p>
            </div>
            <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white/80 rounded-full transition-all duration-500"
                style={{ width: `${usageStats.storage.percentage}%` }}
              />
            </div>
          </motion.div>

          {/* Amount Processed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <Wallet className="w-8 h-8 opacity-80" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Processed</span>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-1">
                {getDisplayPrice(usageStats.amount.processed)}
              </div>
              <p className="text-sm opacity-80">Total Amount Processed</p>
            </div>
          </motion.div>

          {/* Tasks Completed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-6 text-white shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <ListChecks className="w-8 h-8 opacity-80" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Tasks</span>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-1">
                {usageStats.tasks.completed.toLocaleString()}
              </div>
              <p className="text-sm opacity-80">Tasks Completed</p>
            </div>
          </motion.div>
        </div>

        {/* Subscription Utilization Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plan vs Usage Chart - Circular Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Plan vs Usage</h3>
            </div>
            <div className="flex items-center justify-center py-4">
              <div className="relative w-36 h-36">
                {/* Circular Progress */}
                <svg className="w-36 h-36 transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-slate-200"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${(usageStats.users.percentage || 0) * 3.77} 377`}
                    className={`transition-all duration-1000 ${
                      usageStats.users.percentage >= 90 ? 'text-red-500' : 
                      usageStats.users.percentage >= 75 ? 'text-amber-500' : 'text-blue-500'
                    }`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-slate-800">
                    {Math.round(usageStats.users.percentage || 0)}%
                  </span>
                  <span className="text-sm text-slate-500">Utilized</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  Active Users
                </span>
                <span className="font-semibold text-slate-800">{roleStats.active}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                  Available Slots
                </span>
                <span className="font-semibold text-slate-800">
                  {usageStats.users.limit - usageStats.users.used}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Resource Allocation - Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Resource Allocation</h3>
            </div>
            <div className="space-y-4">
              {/* User Slots Bar */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                  <span>User Slots</span>
                  <span>{usageStats.users.used}/{usageStats.users.limit}</span>
                </div>
                <div className="h-8 bg-slate-100 rounded-lg overflow-hidden flex">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-end pr-2 transition-all duration-500"
                    style={{ width: `${Math.min(usageStats.users.percentage || 0, 100)}%` }}
                  >
                    {usageStats.users.percentage >= 20 && (
                      <span className="text-xs text-white font-medium">{usageStats.users.used}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Storage Bar */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                  <span>Storage</span>
                  <span>{(usageStats.storage.used / 1024).toFixed(1)} GB / {(usageStats.storage.limit / 1024).toFixed(0)} GB</span>
                </div>
                <div className="h-8 bg-slate-100 rounded-lg overflow-hidden flex">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-600 flex items-center justify-end pr-2 transition-all duration-500"
                    style={{ width: `${Math.min(usageStats.storage.percentage || 0, 100)}%` }}
                  >
                    {usageStats.storage.percentage >= 20 && (
                      <span className="text-xs text-white font-medium">{(usageStats.storage.used / 1024).toFixed(1)}GB</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Plan Capacity Indicator */}
              <div className="bg-slate-50 rounded-lg p-3 mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-slate-800">
                    {currentPlanName}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white rounded p-2 text-center shadow-sm">
                    <div className="text-lg font-bold text-blue-600">{usageStats.users.limit}</div>
                    <div className="text-slate-500">Max Users</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center shadow-sm">
                    <div className="text-lg font-bold text-green-600">
                      {usageStats.users.limit - usageStats.users.used}
                    </div>
                    <div className="text-slate-500">Available</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Usage Health & Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Usage Health</h3>
            </div>
            <div className="space-y-4">
              {/* Current Plan Highlight */}
              <div className={`rounded-xl p-4 border-2 ${
                currentPlanName.toLowerCase().includes('enterprise') 
                  ? 'border-purple-500 bg-purple-50' 
                  : currentPlanName.toLowerCase().includes('pro') 
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 bg-slate-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PlanIcon className={`w-5 h-5 ${
                      currentPlanName.toLowerCase().includes('enterprise') 
                        ? 'text-purple-500' 
                        : currentPlanName.toLowerCase().includes('pro') 
                          ? 'text-blue-500'
                          : 'text-slate-400'
                    }`} />
                    <span className="font-semibold text-slate-800">
                      {currentPlanName}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                    {subscriptionData?.subscription?.state || 'Active'}
                  </span>
                </div>
              </div>

              {/* Usage Trend Indicator */}
              <div className={`flex items-center gap-3 p-4 rounded-xl ${
                usageStats.users.percentage >= 90 ? 'bg-red-50' :
                usageStats.users.percentage >= 75 ? 'bg-amber-50' :
                'bg-green-50'
              }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  usageStats.users.percentage >= 90 ? 'bg-red-100' :
                  usageStats.users.percentage >= 75 ? 'bg-amber-100' :
                  'bg-green-100'
                }`}>
                  {usageStats.users.percentage >= 90 ? (
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  ) : usageStats.users.percentage >= 75 ? (
                    <TrendingUp className="w-6 h-6 text-amber-600" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  )}
                </div>
                <div>
                  <div className={`text-sm font-semibold ${
                    usageStats.users.percentage >= 90 ? 'text-red-700' :
                    usageStats.users.percentage >= 75 ? 'text-amber-700' :
                    'text-green-700'
                  }`}>
                    {usageStats.users.percentage >= 90 ? 'Near Limit' :
                     usageStats.users.percentage >= 75 ? 'Growing Usage' :
                     'Healthy Usage'}
                  </div>
                  <div className="text-xs text-slate-600">
                    {usageStats.users.percentage >= 90 
                      ? 'Consider upgrading your plan'
                      : usageStats.users.percentage >= 75 
                        ? 'Monitor your usage closely'
                        : 'Plenty of capacity available'
                    }
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-indigo-600">{roleStats.active}</div>
                  <div className="text-xs text-slate-500">Active Users</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-600">{roleStats.pending}</div>
                  <div className="text-xs text-slate-500">Pending Users</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Plan & Pricing */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Subscription Details Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${planTier.color} flex items-center justify-center shadow-lg`}>
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-800">Subscription Details</h2>
                      <p className="text-sm text-slate-500">Your current plan and billing information</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-800">
                      {getDisplayPrice(subscriptionData?.plan?.base_price || 0)}
                    </div>
                    <p className="text-sm text-slate-500">
                      /{subscriptionData?.plan?.billing_cycle || 'month'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <Calendar className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 mb-1">Start Date</p>
                  <p className="font-semibold text-slate-700">
                    {subscriptionData?.subscription?.trial_start_date 
                      ? new Date(subscriptionData.subscription.trial_start_date).toLocaleDateString()
                      : subscriptionData?.subscription?.started_at 
                        ? new Date(subscriptionData.subscription.started_at).toLocaleDateString()
                        : subscriptionData?.subscription?.current_period_start
                          ? new Date(subscriptionData.subscription.current_period_start).toLocaleDateString()
                          : subscriptionData?.subscription?.created_at
                            ? new Date(subscriptionData.subscription.created_at).toLocaleDateString()
                            : 'N/A'}
                  </p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 mb-1">Renewal Date</p>
                  <p className="font-semibold text-slate-700">
                    {subscriptionData?.subscription?.current_period_end 
                      ? new Date(subscriptionData.subscription.current_period_end).toLocaleDateString()
                      : subscriptionData?.subscription?.end_date
                        ? new Date(subscriptionData.subscription.end_date).toLocaleDateString() 
                        : 'N/A'}
                  </p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <Activity className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <p className={`font-semibold ${subscriptionData?.has_subscription || subscriptionData?.subscription?.is_active ? 'text-green-600' : 'text-amber-600'}`}>
                    {subscriptionData?.subscription?.state || (subscriptionData?.has_subscription ? 'Active' : 'Free')}
                  </p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <DollarSign className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 mb-1">Billing Cycle</p>
                  <p className="font-semibold text-slate-700 capitalize">
                    {subscriptionData?.subscription?.billing_cycle || subscriptionData?.plan?.billing_cycle || 'Monthly'}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Features Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden"
            >
              <div 
                className="p-6 border-b border-slate-100 cursor-pointer flex items-center justify-between"
                onClick={() => setShowAllFeatures(!showAllFeatures)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-800">Plan Features</h2>
                    <p className="text-sm text-slate-500">
                      {Object.values(currentFeatures).filter(v => v === true).length} features enabled
                    </p>
                  </div>
                </div>
                {showAllFeatures ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>

              <AnimatePresence>
                {showAllFeatures && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(currentFeatures).map(([key, value]) => (
                        <div 
                          key={key}
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            value === true ? 'bg-green-50' : value === false ? 'bg-slate-50' : 'bg-blue-50'
                          }`}
                        >
                          {value === true ? (
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          ) : value === false ? (
                            <AlertCircle className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          ) : (
                            <TrendingUp className="w-5 h-5 text-blue-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                            {typeof value !== 'boolean' && (
                              <p className="text-xs text-slate-500">{String(value)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Billing History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden"
            >
              <div 
                className="p-6 border-b border-slate-100 cursor-pointer flex items-center justify-between"
                onClick={() => setShowBillingHistory(!showBillingHistory)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-800">Billing History</h2>
                    <p className="text-sm text-slate-500">
                      {subscriptionData?.billing_history?.length || 0} transactions
                    </p>
                  </div>
                </div>
                {showBillingHistory ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>

              <AnimatePresence>
                {showBillingHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6">
                      {subscriptionData?.billing_history && subscriptionData.billing_history.length > 0 ? (
                        <div className="space-y-3">
                          {subscriptionData.billing_history.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  item.status === 'paid' ? 'bg-green-100' : 'bg-amber-100'
                                }`}>
                                  {item.status === 'paid' ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                  ) : (
                                    <Clock className="w-5 h-5 text-amber-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-700">{item.description}</p>
                                  <p className="text-xs text-slate-500">
                                    {new Date(item.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-slate-800">
                                  {getDisplayPrice(item.amount)}
                                </p>
                                <p className={`text-xs font-medium ${
                                  item.status === 'paid' ? 'text-green-600' : 'text-amber-600'
                                }`}>
                                  {item.status.toUpperCase()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No billing history available</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Right Column - Usage & Roles */}
          <div className="space-y-6">
            
            {/* Role Usage Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-800">Role Usage</h2>
                    <p className="text-sm text-slate-500">Team member status</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <Users className="w-5 h-5 text-slate-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-slate-800">{roleStats.total}</p>
                    <p className="text-xs text-slate-500">Total</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-xl">
                    <UserCheck className="w-5 h-5 text-green-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-600">{roleStats.active}</p>
                    <p className="text-xs text-slate-500">Active</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-xl">
                    <UserX className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-amber-600">{roleStats.pending}</p>
                    <p className="text-xs text-slate-500">Pending</p>
                  </div>
                </div>

                {/* Usage Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Users Used</span>
                    <span className="font-medium text-slate-700">
                      {usageStats.users.used} / {usageStats.users.limit}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        usageStats.users.percentage > 90 ? 'bg-red-500' :
                        usageStats.users.percentage > 70 ? 'bg-amber-500' :
                        'bg-gradient-to-r from-violet-500 to-purple-500'
                      }`}
                      style={{ width: `${usageStats.users.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Role Breakdown */}
                <div className="space-y-2 pt-2">
                  <p className="text-sm font-medium text-slate-700">Role Breakdown</p>
                  {Object.entries(roleStats.breakdown).map(([role, counts]) => (
                    <div key={role} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-600 capitalize">
                        {role.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                          {counts.active} active
                        </span>
                        {counts.pending > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                            {counts.pending} pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6"
            >
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => setShowCreateUserModal(true)}
                  disabled={!canCreateUser}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    canCreateUser 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:opacity-90' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <UserPlus className="w-5 h-5" />
                  <span className="font-medium">Create User</span>
                </button>
                <button 
                  onClick={handleUpgradePlan}
                  className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:opacity-90 transition-opacity"
                >
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-medium">Upgrade Plan</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
                  <Download className="w-5 h-5" />
                  <span className="font-medium">Download Invoice</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
                  <CreditCard className="w-5 h-5" />
                  <span className="font-medium">Update Payment Method</span>
                </button>
              </div>
            </motion.div>

            {/* Tenant Info */}
            {tenantData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6"
              >
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Organization</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm text-slate-600">Name</span>
                    <span className="font-medium text-slate-800">{tenantData.name}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm text-slate-600">Slug</span>
                    <code className="text-sm bg-slate-200 px-2 py-0.5 rounded">{tenantData.slug}</code>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      <CreateFullUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onSuccess={() => {
          setShowCreateUserModal(false);
          fetchData();
          refreshSubscription();
          toast({ title: 'User created successfully', variant: 'success' });
        }}
      />

      {/* Upgrade Plan Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUpgradeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-500 to-purple-600">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Choose Your Plan</h2>
                    <p className="text-indigo-100 mt-1">Select a plan that fits your business needs</p>
                  </div>
                  {subscriptionData?.subscription?.trial_end_date && !subscriptionData?.subscription?.trial_converted && (
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Trial: {Math.max(0, Math.ceil((new Date(subscriptionData.subscription.trial_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days remaining
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Plans Grid */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {availablePlans.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Zap className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">No plans available</p>
                    <p className="text-sm mt-2">Contact support for custom enterprise plans</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availablePlans.map((plan) => {
                      const isCurrentPlan = currentPlanCode?.toUpperCase() === plan.plan_code?.toUpperCase();
                      const isSelected = selectedPlanCode === plan.plan_code;
                      
                      return (
                        <div
                          key={plan.id}
                          onClick={() => !isCurrentPlan && setSelectedPlanCode(plan.plan_code)}
                          className={`relative rounded-xl border-2 p-5 cursor-pointer transition-all ${
                            isCurrentPlan 
                              ? 'border-green-500 bg-green-50 cursor-not-allowed opacity-75'
                              : isSelected 
                                ? 'border-indigo-500 bg-indigo-50 shadow-lg ring-2 ring-indigo-200' 
                                : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
                          }`}
                        >
                          {plan.is_popular && !isCurrentPlan && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-md">
                              POPULAR
                            </span>
                          )}
                          {isCurrentPlan && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-md">
                              CURRENT
                            </span>
                          )}
                          
                          <div className="text-center mb-4 pt-2">
                            <h3 className="text-lg font-bold text-slate-800">{plan.name}</h3>
                            <div className="mt-2">
                              <span className="text-3xl font-extrabold text-indigo-600">
                                {getDisplayPrice(plan.price_monthly)}
                              </span>
                              <span className="text-slate-500 text-sm">/month</span>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Users className="w-4 h-4 text-indigo-500" />
                              <span>{plan.max_users === -1 ? 'Unlimited' : plan.max_users} Users</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <HardDrive className="w-4 h-4 text-green-500" />
                              <span>{plan.max_storage_gb === -1 ? 'Unlimited' : `${plan.max_storage_gb} GB`} Storage</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <Layers className="w-4 h-4 text-purple-500" />
                              <span>{plan.max_branches === -1 ? 'Unlimited' : plan.max_branches} Branches</span>
                            </div>
                          </div>

                          {plan.description && (
                            <p className="mt-3 text-xs text-slate-500 line-clamp-2">{plan.description}</p>
                          )}

                          {isSelected && !isCurrentPlan && (
                            <div className="mt-4 flex items-center justify-center gap-2 text-indigo-600 font-medium">
                              <CheckCircle className="w-5 h-5" />
                              <span>Selected</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    setSelectedPlanCode(null);
                  }}
                  className="px-6 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUpgrade}
                  disabled={!selectedPlanCode || upgrading}
                  className={`px-8 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                    selectedPlanCode && !upgrading
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 shadow-lg'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {upgrading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      Select Plan
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BillingPage;
