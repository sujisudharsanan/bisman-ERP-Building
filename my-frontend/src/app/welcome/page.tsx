'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  Shield,
  Users,
  CheckCircle,
  Lock,
  LogOut,
  Loader2,
  Building2,
  Zap,
  Crown,
  Star,
  ArrowRight,
  Sparkles,
  X,
  GitCompare,
  Check,
  Clock,
  FileText,
  Headphones,
  Database,
  BarChart3,
  UserCheck,
  Settings,
  Bell,
  MessageCircle,
} from 'lucide-react';

// Dynamically import the existing ChatInterface and FloatingWidget to avoid SSR issues
const ChatInterface = dynamic(
  () => import('@/modules/chat/components/ChatInterface'),
  { ssr: false, loading: () => <div className="w-[440px] h-[600px] bg-[#1e1e2e] rounded-lg animate-pulse" /> }
);

const FloatingWidget = dynamic(
  () => import('@/modules/chat/components/FloatingWidget'),
  { ssr: false }
);

// Dynamically import DarkModeToggle to avoid SSR issues
const DarkModeToggle = dynamic(
  () => import('@/components/ui/DarkModeToggle'),
  { ssr: false }
);

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  price_monthly: number;
  currency: string;
  max_users: number;
  max_branches?: number;
  max_storage_gb?: number;
  trial_days: number;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  approval_levels?: number;
  audit_retention_days?: number;
  support_tier?: string;
}

// No hardcoded fallback - prices are managed by Super Admin in the database

function formatCurrency(amount: number): string {
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatLimit(value: number): string {
  if (value === -1) return 'Unlimited';
  return value.toString();
}

function ComparePlansModal({
  plans,
  isOpen,
  onClose,
}: {
  plans: SubscriptionPlan[];
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const features = [
    { label: 'Max Users', key: 'max_users', format: formatLimit },
    { label: 'Max Branches', key: 'max_branches', format: formatLimit },
    { label: 'Storage', key: 'max_storage_gb', format: (v: number) => v === -1 ? 'Unlimited' : `${v} GB` },
    { label: 'Trial Days', key: 'trial_days', format: (v: number) => v === 0 ? 'No Trial' : `${v} Days` },
    { label: 'Approval Levels', key: 'approval_levels', format: (v: number) => `${v} Levels` },
    { label: 'Audit Retention', key: 'audit_retention_days', format: (v: number) => `${v} Days` },
    { label: 'Support', key: 'support_tier', format: (v: string) => v || 'Basic' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <GitCompare className="w-6 h-6" />
            <h2 className="text-xl font-bold">Compare Plans</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-3 bg-yellow-50 text-blue-800 font-semibold border-b-2 border-blue-100">Feature</th>
                {plans.filter(p => p.is_active).map(plan => (
                  <th key={plan.id} className={`text-center p-3 border-b-2 border-blue-100 ${plan.is_popular ? 'bg-blue-50' : 'bg-yellow-50'}`}>
                    <div className="text-blue-800 font-bold">{plan.name}</div>
                    <div className="text-blue-600 text-sm">{formatCurrency(plan.price_monthly)}/mo</div>
                    {plan.is_popular && (
                      <span className="inline-flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full mt-1">
                        <Sparkles className="w-3 h-3" /> Popular
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature, idx) => (
                <tr key={feature.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-yellow-50/50'}>
                  <td className="p-3 text-blue-800 font-medium border-b border-blue-100">{feature.label}</td>
                  {plans.filter(p => p.is_active).map(plan => {
                    const value = (plan as unknown as Record<string, unknown>)[feature.key];
                    return (
                      <td key={plan.id} className={`text-center p-3 text-blue-700 border-b border-blue-100 ${plan.is_popular ? 'bg-blue-50/50' : ''}`}>
                        {feature.format(value as number & string)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-yellow-50 border-t border-blue-100 rounded-b-2xl">
          <button onClick={onClose} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700">
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan, isSelected, onSelect }: { plan: SubscriptionPlan; isSelected: boolean; onSelect: () => void }) {
  const getIcon = () => {
    switch (plan.code) {
      case 'FREE': return Zap;
      case 'BASIC': return Users;
      case 'STANDARD': return Star;
      case 'PREMIUM': return Crown;
      case 'ENTERPRISE': return Building2;
      default: return Zap;
    }
  };
  const Icon = getIcon();

  const getIconBgClass = () => {
    switch (plan.code) {
      case 'FREE': return 'bg-slate-500';
      case 'BASIC': return 'bg-emerald-500';
      case 'STANDARD': return 'bg-blue-600';
      case 'PREMIUM': return 'bg-purple-600';
      case 'ENTERPRISE': return 'bg-amber-500';
      default: return 'bg-slate-500';
    }
  };

  const getReportType = () => {
    switch (plan.code) {
      case 'FREE': return 'Basic Reports';
      case 'BASIC': return 'Standard Reports';
      case 'STANDARD': return 'Advanced Reports';
      case 'PREMIUM': return 'Custom Reports';
      case 'ENTERPRISE': return 'All Features';
      default: return 'Basic Reports';
    }
  };

  const getApiAccess = () => {
    switch (plan.code) {
      case 'FREE': return 'No API';
      case 'BASIC': return 'Limited API';
      case 'STANDARD': return 'Full API';
      case 'PREMIUM': return 'Full API + Webhooks';
      case 'ENTERPRISE': return 'Full API + Custom';
      default: return 'No API';
    }
  };

  const getCustomization = () => {
    switch (plan.code) {
      case 'FREE': return 'None';
      case 'BASIC': return 'Basic';
      case 'STANDARD': return 'Moderate';
      case 'PREMIUM': return 'Advanced';
      case 'ENTERPRISE': return 'Full Custom';
      default: return 'None';
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`relative flex flex-col p-5 rounded-xl border-2 cursor-pointer bg-white dark:bg-slate-800 shadow-md min-h-[520px] transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:-translate-y-1 ${isSelected ? 'border-blue-500 ring-2 ring-blue-300 dark:ring-blue-700 shadow-lg' : plan.is_popular ? 'border-blue-400 dark:border-blue-500' : 'border-blue-100 dark:border-slate-600'}`}
    >
      {plan.is_popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg uppercase tracking-wide flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Popular
          </span>
        </div>
      )}

      <div className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-blue-200 dark:border-slate-500'}`}>
        {isSelected && <Check className="w-4 h-4 text-white" />}
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className={`w-11 h-11 rounded-lg ${getIconBgClass()} flex items-center justify-center shadow-md`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-blue-800 dark:text-blue-300">{plan.name}</h3>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{plan.description}</p>

      <div className="mb-4 pb-3 border-b border-gray-100 dark:border-slate-600">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-blue-800 dark:text-blue-300">{formatCurrency(plan.price_monthly)}</span>
          {plan.price_monthly > 0 && <span className="text-xs text-blue-500 dark:text-blue-400">/mo</span>}
        </div>
        {plan.trial_days > 0 && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">{plan.trial_days}-day free trial</p>
        )}
      </div>

      <div className="space-y-2 flex-1 text-xs">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <Users className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
          <span>{formatLimit(plan.max_users)} Users</span>
        </div>
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <Building2 className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
          <span>{formatLimit(plan.max_branches || 1)} Branches</span>
        </div>
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <UserCheck className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
          <span>{plan.approval_levels || 1} Approval Levels</span>
        </div>
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
          <span>{plan.audit_retention_days || 30} Days Audit</span>
        </div>
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <Database className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
          <span>{plan.max_storage_gb === -1 ? 'Unlimited' : `${plan.max_storage_gb} GB`} Storage</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <BarChart3 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
          <span>{getReportType()}</span>
        </div>
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <Settings className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
          <span>{getApiAccess()}</span>
        </div>
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
          <span>{getCustomization()} Customization</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <Headphones className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
          <span>{plan.support_tier || 'Email'} Support</span>
        </div>
        {plan.code === 'ENTERPRISE' && (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Bell className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
            <span>Dedicated Manager</span>
          </div>
        )}
      </div>

      <button className={`mt-4 w-full py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-yellow-100 dark:bg-slate-700 text-blue-700 dark:text-blue-300 hover:bg-yellow-200 dark:hover:bg-slate-600'}`}>
        {isSelected ? (
          <><CheckCircle className="w-4 h-4" /> Selected</>
        ) : (
          <>Select Plan <ArrowRight className="w-4 h-4" /></>
        )}
      </button>
    </div>
  );
}

export default function WelcomePage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [organizationName, setOrganizationName] = useState('Your Organization');
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showWelcomeChat, setShowWelcomeChat] = useState(true);
  // Coupon modal state
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponValid, setCouponValid] = useState<{ discount: number; type: 'percentage' | 'fixed' } | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/welcome/plans`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.plans && data.plans.length > 0) {
            setPlans(data.plans);
            if (data.organizationName) setOrganizationName(data.organizationName);
            setLoadError(null);
          } else {
            setLoadError('No subscription plans available. Please contact your administrator.');
          }
        } else {
          setLoadError('Failed to load subscription plans. Please try again later.');
        }
      } catch (err) {
        console.error('Failed to fetch plans:', err);
        setLoadError('Unable to connect to the server. Please check your connection.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSelectPlan = (plan: SubscriptionPlan) => setSelectedPlan(plan);

  const handleContinue = () => {
    if (!selectedPlan) return;
    // If it's a paid plan, show coupon modal first
    if (selectedPlan.price_monthly > 0) {
      setShowCouponModal(true);
      setCouponCode('');
      setCouponError(null);
      setCouponValid(null);
      return;
    }
    // Free plan - continue directly
    sessionStorage.setItem('selectedPlan', JSON.stringify(selectedPlan));
    router.push('/welcome/branding');
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }
    setCouponValidating(true);
    setCouponError(null);
    try {
      const response = await fetch(`${API_BASE}/api/welcome/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: couponCode.trim().toUpperCase(), planCode: selectedPlan?.code })
      });
      const data = await response.json();
      if (data.ok && data.valid) {
        setCouponValid({ discount: data.discount, type: data.type });
        setCouponError(null);
      } else {
        setCouponError(data.error || 'Invalid coupon code');
        setCouponValid(null);
      }
    } catch {
      setCouponError('Failed to validate coupon. Please try again.');
    } finally {
      setCouponValidating(false);
    }
  };

  const handleProceedWithCoupon = () => {
    if (!selectedPlan) return;
    // Store plan and coupon info, then proceed
    sessionStorage.setItem('selectedPlan', JSON.stringify({
      ...selectedPlan,
      couponCode: couponValid ? couponCode.trim().toUpperCase() : null,
      couponDiscount: couponValid?.discount || 0,
      couponType: couponValid?.type || null,
      startAsTrial: !couponValid // If no valid coupon, start as trial
    }));
    setShowCouponModal(false);
    router.push('/welcome/branding');
  };

  const handleStartTrial = () => {
    if (!selectedPlan) return;
    // Start trial without coupon
    sessionStorage.setItem('selectedPlan', JSON.stringify({
      ...selectedPlan,
      couponCode: null,
      couponDiscount: 0,
      couponType: null,
      startAsTrial: true,
      trialDays: selectedPlan.trial_days || 14
    }));
    setShowCouponModal(false);
    router.push('/welcome/branding');
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
      router.push('/auth/login');
    } catch {
      router.push('/auth/login');
    }
  };

  const handleRetry = () => {
    setIsLoading(true);
    setLoadError(null);
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-blue-600 dark:text-blue-400">Loading workspace setup...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Unable to Load Plans</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{loadError}</p>
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-200/40 dark:bg-blue-900/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-200/30 dark:bg-indigo-900/30 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-blue-100 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/brand/bisman-logo.svg" alt="BISMAN ERP" width={40} height={40} className="rounded-lg" />
            <div>
              <h1 className="text-lg font-bold text-blue-800 dark:text-blue-300">BISMAN ERP</h1>
              <p className="text-[10px] text-blue-500 dark:text-blue-400">Workspace Setup</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-4">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl px-4 py-3 mb-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Welcome, <span className="text-yellow-200">{organizationName}</span> Admin!</p>
              <p className="text-blue-200 text-xs">Choose your subscription plan to get started</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCompareModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-xs font-medium">
              <GitCompare className="w-4 h-4" /> Compare Plans
            </button>
            <button onClick={() => setShowWelcomeChat(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-xs font-medium">
              <MessageCircle className="w-4 h-4" /> Need Help?
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {plans.filter(p => p.is_active).map(plan => (
            <PlanCard key={plan.id} plan={plan} isSelected={selectedPlan?.id === plan.id} onSelect={() => handleSelectPlan(plan)} />
          ))}
        </div>

        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl p-4 border border-blue-100 dark:border-slate-700 shadow-lg mb-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              {selectedPlan ? (
                <div>
                  <p className="text-blue-800 dark:text-blue-300 font-medium">Selected: <span className="text-blue-600 dark:text-blue-400">{selectedPlan.name}</span> Plan</p>
                  <p className="text-blue-500 dark:text-blue-400 text-sm">{formatCurrency(selectedPlan.price_monthly)}/month - {formatLimit(selectedPlan.max_users)} users</p>
                </div>
              ) : (
                <p className="text-blue-500 dark:text-blue-400">Select a plan to continue</p>
              )}
            </div>
            <button
              onClick={handleContinue}
              disabled={!selectedPlan || isActivating}
              className={`px-8 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 ${selectedPlan ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:scale-105' : 'bg-blue-100 dark:bg-slate-700 text-blue-400 dark:text-slate-400 cursor-not-allowed'}`}
            >
              {isActivating ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><ArrowRight className="w-4 h-4" /> Continue to Branding Setup</>}
            </button>
          </div>
        </div>

        <div className="flex justify-center">
          <p className="text-blue-400 dark:text-blue-300 text-xs flex items-center gap-1">
            <Lock className="w-3 h-3" /> Subscription can be changed or upgraded anytime from settings
          </p>
        </div>
      </main>

      {/* Floating Chat Button - Uses existing FloatingWidget like other pages */}
      {!showWelcomeChat && (
        <div className="fixed bottom-4 right-4 z-[9999]">
          <FloatingWidget
            onOpen={() => setShowWelcomeChat(true)}
            position="bottom-right"
            primaryColor="#0A3A63"
            accentColor="#FFC20A"
            hasNotification={false}
            size={72}
          />
        </div>
      )}

      {/* ChatInterface - positioned in bottom right corner, same as ChatGuard */}
      {showWelcomeChat && (
        <div className="fixed z-[999] shadow-2xl overflow-hidden animate-slide-in
          inset-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[440px] sm:h-[600px] sm:rounded-lg">
          <ChatInterface onClose={() => setShowWelcomeChat(false)} />
        </div>
      )}
      <ComparePlansModal plans={plans} isOpen={showCompareModal} onClose={() => setShowCompareModal(false)} />

      {/* Coupon Code Modal */}
      {showCouponModal && selectedPlan && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Complete Your Selection</h2>
                  <p className="text-purple-100 text-sm mt-1">{selectedPlan.name} Plan - {formatCurrency(selectedPlan.price_monthly)}/month</p>
                </div>
                <button
                  onClick={() => setShowCouponModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Coupon Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Have a Coupon Code?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponError(null);
                      setCouponValid(null);
                    }}
                    placeholder="Enter coupon code"
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
                  />
                  <button
                    onClick={handleValidateCoupon}
                    disabled={couponValidating || !couponCode.trim()}
                    className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2"
                  >
                    {couponValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Apply
                  </button>
                </div>
                {couponError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <X className="w-4 h-4" /> {couponError}
                  </p>
                )}
                {couponValid && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> 
                    Coupon applied! {couponValid.type === 'percentage' ? `${couponValid.discount}% off` : `₹${couponValid.discount} off`}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
                <span className="text-gray-500 text-sm">OR</span>
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
              </div>

              {/* Trial Option */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Start Free Trial</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Try {selectedPlan.name} plan free for <strong>{selectedPlan.trial_days || 14} days</strong>. 
                      No payment required now. You can add payment later to continue.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {couponValid ? (
                  <button
                    onClick={handleProceedWithCoupon}
                    className="w-full py-3 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                  >
                    <Zap className="w-5 h-5" />
                    Start Subscription Now
                    <span className="text-green-200 text-sm">
                      ({couponValid.type === 'percentage' 
                        ? formatCurrency(selectedPlan.price_monthly * (1 - couponValid.discount / 100))
                        : formatCurrency(Math.max(0, selectedPlan.price_monthly - couponValid.discount))}/mo)
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartTrial}
                    className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <Clock className="w-5 h-5" />
                    Start {selectedPlan.trial_days || 14}-Day Free Trial
                  </button>
                )}
                <button
                  onClick={() => setShowCouponModal(false)}
                  className="w-full py-3 px-4 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
