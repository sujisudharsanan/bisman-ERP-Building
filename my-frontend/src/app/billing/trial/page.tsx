'use client';

/**
 * Trial Management Page (Admin View)
 * BISMAN ERP - Tenant Trial Management
 *
 * Features:
 * - Trial start and expiry dates
 * - Trial extension functionality
 * - Trial conversion tracking
 * - Manual override capabilities
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Users,
  TrendingUp,
  ArrowLeft,
  Plus,
  Minus,
  RefreshCw,
  X,
  Zap,
  Shield,
  Gift,
  Settings,
  History,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TrialInfo {
  status: 'active' | 'expired' | 'converted' | 'cancelled';
  startDate: string;
  endDate: string;
  daysLeft: number;
  daysUsed: number;
  totalDays: number;
  extensions: {
    date: string;
    days: number;
    reason: string;
    extendedBy: string;
  }[];
  usage: {
    activeUsers: number;
    modulesUsed: number;
    actionsPerformed: number;
    storageUsed: number;
  };
  conversionLikelihood: number;
  features: {
    name: string;
    used: boolean;
    usageCount: number;
  }[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 0) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Trial Status Banner
function TrialStatusBanner({ info }: { info: TrialInfo }) {
  const getStatusConfig = () => {
    switch (info.status) {
      case 'active':
        if (info.daysLeft <= 3) {
          return {
            bg: 'bg-red-500',
            icon: AlertTriangle,
            title: 'Trial Ending Soon!',
            subtitle: `Only ${info.daysLeft} day${info.daysLeft !== 1 ? 's' : ''} remaining`,
          };
        }
        if (info.daysLeft <= 7) {
          return {
            bg: 'bg-yellow-500',
            icon: Clock,
            title: 'Trial Active',
            subtitle: `${info.daysLeft} days remaining`,
          };
        }
        return {
          bg: 'bg-green-500',
          icon: CheckCircle,
          title: 'Trial Active',
          subtitle: `${info.daysLeft} days remaining`,
        };
      case 'expired':
        return {
          bg: 'bg-red-600',
          icon: AlertTriangle,
          title: 'Trial Expired',
          subtitle: `Expired ${formatRelativeDate(info.endDate)}`,
        };
      case 'converted':
        return {
          bg: 'bg-violet-500',
          icon: Zap,
          title: 'Converted to Paid',
          subtitle: 'Subscription active',
        };
      case 'cancelled':
        return {
          bg: 'bg-gray-500',
          icon: X,
          title: 'Trial Cancelled',
          subtitle: 'No longer active',
        };
      default:
        return {
          bg: 'bg-gray-500',
          icon: Clock,
          title: 'Unknown Status',
          subtitle: '',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${config.bg} text-white rounded-xl p-6 mb-6`}
    >
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
          <Icon className="w-8 h-8" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{config.title}</h2>
          <p className="text-lg opacity-90">{config.subtitle}</p>
        </div>
        {info.status === 'active' && (
          <div className="text-right">
            <p className="text-sm opacity-75">Trial Period</p>
            <p className="text-xl font-semibold">
              Day {info.daysUsed} of {info.totalDays}
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {info.status === 'active' && (
        <div className="mt-4">
          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(info.daysUsed / info.totalDays) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-white rounded-full"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Trial Dates Card
function TrialDatesCard({ info }: { info: TrialInfo }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-violet-500" />
        Trial Dates
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Trial Started</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(info.startDate)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                info.status === 'expired'
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-yellow-100 dark:bg-yellow-900/30'
              }`}
            >
              <Clock
                className={`w-5 h-5 ${
                  info.status === 'expired' ? 'text-red-500' : 'text-yellow-500'
                }`}
              />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {info.status === 'expired' ? 'Trial Expired' : 'Trial Ends'}
              </p>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(info.endDate)}</p>
            </div>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {formatRelativeDate(info.endDate)}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Gift className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Trial Duration</p>
              <p className="font-medium text-gray-900 dark:text-white">{info.totalDays} days</p>
            </div>
          </div>
          {info.extensions.length > 0 && (
            <span className="text-sm text-violet-600 dark:text-violet-400">
              +{info.extensions.reduce((sum, e) => sum + e.days, 0)} extended
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Trial Usage Stats
function TrialUsageCard({ info }: { info: TrialInfo }) {
  const stats = [
    { label: 'Active Users', value: info.usage.activeUsers, icon: Users, color: 'text-blue-500' },
    { label: 'Modules Used', value: info.usage.modulesUsed, icon: Settings, color: 'text-green-500' },
    { label: 'Actions Performed', value: info.usage.actionsPerformed.toLocaleString(), icon: TrendingUp, color: 'text-violet-500' },
    { label: 'Storage Used', value: `${info.usage.storageUsed} GB`, icon: BarChart3, color: 'text-orange-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-violet-500" />
        Trial Usage
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</span>
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Conversion Likelihood */}
      <div className="mt-4 p-4 rounded-lg bg-violet-50 dark:bg-violet-900/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-violet-700 dark:text-violet-400">
            Conversion Likelihood
          </span>
          <span className="text-lg font-bold text-violet-700 dark:text-violet-400">
            {info.conversionLikelihood}%
          </span>
        </div>
        <div className="h-2 bg-violet-200 dark:bg-violet-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${info.conversionLikelihood}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-violet-500 rounded-full"
          />
        </div>
        <p className="text-xs text-violet-600 dark:text-violet-400 mt-2">
          Based on feature usage and engagement patterns
        </p>
      </div>
    </motion.div>
  );
}

// Feature Adoption Card
function FeatureAdoptionCard({ features }: { features: TrialInfo['features'] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-violet-500" />
        Feature Adoption
      </h3>

      <div className="space-y-3">
        {features.map((feature, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50"
          >
            <div className="flex items-center gap-3">
              {feature.used ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
              )}
              <span className="text-gray-900 dark:text-white">{feature.name}</span>
            </div>
            {feature.used && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {feature.usageCount} uses
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {features.filter((f) => f.used).length} of {features.length} features adopted
        </p>
      </div>
    </motion.div>
  );
}

// Extension History Card
function ExtensionHistoryCard({ extensions }: { extensions: TrialInfo['extensions'] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <History className="w-5 h-5 text-violet-500" />
        Extension History
      </h3>

      {extensions.length > 0 ? (
        <div className="space-y-3">
          {extensions.map((ext, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white">+{ext.days} days</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{ext.reason}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(ext.date)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">by {ext.extendedBy}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No extensions granted</p>
        </div>
      )}
    </motion.div>
  );
}

// Extend Trial Modal
function ExtendTrialModal({
  isOpen,
  onClose,
  onExtend,
}: {
  isOpen: boolean;
  onClose: () => void;
  onExtend: (days: number, reason: string) => void;
}) {
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onExtend(days, reason);
    setIsSubmitting(false);
    onClose();
  };

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
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Plus className="w-5 h-5 text-violet-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Extend Trial</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Days Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Extension Duration
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setDays(Math.max(1, days - 1))}
                className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex-1 text-center">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{days}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-2">days</span>
              </div>
              <button
                type="button"
                onClick={() => setDays(Math.min(30, days + 1))}
                className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-center gap-2 mt-3">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    days === d
                      ? 'bg-violet-600 text-white'
                      : 'border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason for Extension
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
              placeholder="e.g., Customer requested more time for evaluation"
              required
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !reason.trim()}
            className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Extend by {days} Days
              </>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TrialManagementPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [showExtendModal, setShowExtendModal] = useState(false);

  const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

  const fetchTrialInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${baseURL}/api/billing/trial`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setTrialInfo(data);
      } else {
        generateDemoData();
      }
    } catch {
      generateDemoData();
    } finally {
      setIsLoading(false);
    }
  }, [baseURL]);

  const generateDemoData = () => {
    const startDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const endDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);

    setTrialInfo({
      status: 'active',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      daysLeft: 4,
      daysUsed: 10,
      totalDays: 14,
      extensions: [
        {
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          days: 7,
          reason: 'Customer needed more time for team onboarding',
          extendedBy: 'Admin User',
        },
      ],
      usage: {
        activeUsers: 8,
        modulesUsed: 5,
        actionsPerformed: 1247,
        storageUsed: 2.4,
      },
      conversionLikelihood: 78,
      features: [
        { name: 'Inventory Management', used: true, usageCount: 45 },
        { name: 'Sales Orders', used: true, usageCount: 23 },
        { name: 'Purchase Orders', used: true, usageCount: 12 },
        { name: 'Reporting & Analytics', used: true, usageCount: 8 },
        { name: 'User Management', used: true, usageCount: 15 },
        { name: 'API Integration', used: false, usageCount: 0 },
        { name: 'Custom Workflows', used: false, usageCount: 0 },
        { name: 'Advanced Permissions', used: false, usageCount: 0 },
      ],
    });
  };

  useEffect(() => {
    fetchTrialInfo();
  }, [fetchTrialInfo]);

  const handleExtendTrial = async (days: number, reason: string) => {
    try {
      const response = await fetch(`${baseURL}/api/billing/trial/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ days, reason }),
      });

      if (response.ok) {
        fetchTrialInfo();
      } else {
        // Demo mode: simulate extension
        if (trialInfo) {
          const newEndDate = new Date(trialInfo.endDate);
          newEndDate.setDate(newEndDate.getDate() + days);

          setTrialInfo({
            ...trialInfo,
            endDate: newEndDate.toISOString(),
            daysLeft: trialInfo.daysLeft + days,
            totalDays: trialInfo.totalDays + days,
            extensions: [
              ...trialInfo.extensions,
              {
                date: new Date().toISOString(),
                days,
                reason,
                extendedBy: user?.name || 'Admin',
              },
            ],
          });
        }
      }
    } catch (error) {
      console.error('Failed to extend trial:', error);
    }
  };

  const handleConvertToSubscription = () => {
    window.location.href = '/billing';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading trial information...</p>
        </div>
      </div>
    );
  }

  if (!trialInfo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Active Trial
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            There is no active trial for this account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/billing"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Clock className="w-7 h-7 text-violet-500" />
                Trial Management
              </h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              Manage trial period and track usage
            </p>
          </div>

          <div className="flex items-center gap-3">
            {trialInfo.status === 'active' && (
              <>
                <button
                  onClick={() => setShowExtendModal(true)}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Extend Trial
                </button>
                <button
                  onClick={handleConvertToSubscription}
                  className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Convert to Paid
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status Banner */}
        <TrialStatusBanner info={trialInfo} />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrialDatesCard info={trialInfo} />
          <TrialUsageCard info={trialInfo} />
          <FeatureAdoptionCard features={trialInfo.features} />
          <ExtensionHistoryCard extensions={trialInfo.extensions} />
        </div>

        {/* Extend Trial Modal */}
        <AnimatePresence>
          <ExtendTrialModal
            isOpen={showExtendModal}
            onClose={() => setShowExtendModal(false)}
            onExtend={handleExtendTrial}
          />
        </AnimatePresence>
      </div>
    </div>
  );
}
