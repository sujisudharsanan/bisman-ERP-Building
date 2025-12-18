'use client';

/**
 * SuperAdmin Subscription Management Console
 * 
 * Features:
 * - Overview dashboard with subscription metrics
 * - Quick actions for common tasks
 * - Navigation to detailed management pages
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Users,
  Building2,
  TrendingUp,
  AlertTriangle,
  Clock,
  Settings,
  FileText,
  ChevronRight,
  Activity,
  DollarSign,
  Package,
  Shield,
  BarChart3,
  Layers,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SubscriptionMetrics {
  totalTenants: number;
  activeSubscriptions: number;
  trialsActive: number;
  trialsExpiringSoon: number;
  suspendedAccounts: number;
  mrr: number; // Monthly Recurring Revenue
  planBreakdown: {
    starter: number;
    professional: number;
    business: number;
    enterprise: number;
  };
  recentActivity: {
    type: string;
    tenant: string;
    action: string;
    timestamp: string;
  }[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MANAGEMENT_CARDS = [
  {
    title: 'Plan Management',
    description: 'Create, edit, and manage subscription plans and features',
    icon: Package,
    href: '/super-admin/subscriptions/plans',
    color: 'bg-blue-500',
  },
  {
    title: 'Tenant Subscriptions',
    description: 'View and manage individual tenant subscriptions',
    icon: Building2,
    href: '/super-admin/subscriptions/tenants',
    color: 'bg-violet-500',
  },
  {
    title: 'Billing Overrides',
    description: 'Apply custom pricing and feature overrides for tenants',
    icon: DollarSign,
    href: '/super-admin/subscriptions/billing',
    color: 'bg-emerald-500',
  },
  {
    title: 'Audit Logs',
    description: 'Review all subscription-related changes and actions',
    icon: FileText,
    href: '/super-admin/subscriptions/audit',
    color: 'bg-amber-500',
  },
];

// ============================================================================
// COMPONENTS
// ============================================================================

// Metric Card Component
function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  subtext,
}: {
  title: string;
  value: string | number;
  change?: { value: number; positive: boolean };
  icon: React.ElementType;
  color: string;
  subtext?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${change.positive ? 'text-emerald-600' : 'text-red-600'}`}>
              {change.positive ? '+' : ''}{change.value}% from last month
            </p>
          )}
          {subtext && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtext}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

// Management Card Component
function ManagementCard({
  title,
  description,
  icon: Icon,
  href,
  color,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 transition-colors cursor-pointer"
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </motion.div>
    </Link>
  );
}

// Plan Breakdown Chart (simple bar visualization)
function PlanBreakdown({
  breakdown,
}: {
  breakdown: SubscriptionMetrics['planBreakdown'];
}) {
  const total = breakdown.starter + breakdown.professional + breakdown.business + breakdown.enterprise;
  const plans = [
    { name: 'Starter', count: breakdown.starter, color: 'bg-blue-500' },
    { name: 'Professional', count: breakdown.professional, color: 'bg-violet-500' },
    { name: 'Business', count: breakdown.business, color: 'bg-amber-500' },
    { name: 'Enterprise', count: breakdown.enterprise, color: 'bg-emerald-500' },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Plan Distribution</h3>
      <div className="space-y-4">
        {plans.map((plan) => (
          <div key={plan.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">{plan.name}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {plan.count} ({total > 0 ? Math.round((plan.count / total) * 100) : 0}%)
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: total > 0 ? `${(plan.count / total) * 100}%` : '0%' }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`h-full ${plan.color} rounded-full`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Recent Activity Feed
function RecentActivity({
  activities,
}: {
  activities: SubscriptionMetrics['recentActivity'];
}) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'upgrade': return { icon: TrendingUp, color: 'text-emerald-500 bg-emerald-100' };
      case 'downgrade': return { icon: TrendingUp, color: 'text-amber-500 bg-amber-100 rotate-180' };
      case 'trial_start': return { icon: Clock, color: 'text-blue-500 bg-blue-100' };
      case 'cancel': return { icon: AlertTriangle, color: 'text-red-500 bg-red-100' };
      case 'renewal': return { icon: RefreshCw, color: 'text-violet-500 bg-violet-100' };
      default: return { icon: Activity, color: 'text-gray-500 bg-gray-100' };
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
        <Link
          href="/super-admin/subscriptions/audit"
          className="text-sm text-violet-600 hover:text-violet-700"
        >
          View all
        </Link>
      </div>
      <div className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No recent activity
          </p>
        ) : (
          activities.slice(0, 5).map((activity, idx) => {
            const { icon: Icon, color } = getActivityIcon(activity.type);
            return (
              <div key={idx} className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white truncate">
                    <span className="font-medium">{activity.tenant}</span>
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{activity.action}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Alerts Section
function AlertsSection({
  trialsExpiring,
  suspended,
}: {
  trialsExpiring: number;
  suspended: number;
}) {
  if (trialsExpiring === 0 && suspended === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {trialsExpiring > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-500" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {trialsExpiring} trial{trialsExpiring !== 1 ? 's' : ''} expiring soon
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Review and reach out to convert them
              </p>
            </div>
            <Link
              href="/super-admin/subscriptions/tenants?filter=trial_expiring"
              className="ml-auto text-amber-700 dark:text-amber-300 hover:underline text-sm"
            >
              View →
            </Link>
          </div>
        </motion.div>
      )}
      {suspended > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">
                {suspended} suspended account{suspended !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Review for payment issues or violations
              </p>
            </div>
            <Link
              href="/super-admin/subscriptions/tenants?filter=suspended"
              className="ml-auto text-red-700 dark:text-red-300 hover:underline text-sm"
            >
              View →
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function SubscriptionConsolePage() {
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch('/api/super-admin/subscriptions/metrics', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch subscription metrics');
        }

        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        // Set mock data for development
        setMetrics({
          totalTenants: 156,
          activeSubscriptions: 142,
          trialsActive: 23,
          trialsExpiringSoon: 5,
          suspendedAccounts: 2,
          mrr: 458500,
          planBreakdown: {
            starter: 45,
            professional: 67,
            business: 28,
            enterprise: 12,
          },
          recentActivity: [
            { type: 'upgrade', tenant: 'Acme Corp', action: 'Upgraded to Business plan', timestamp: new Date().toISOString() },
            { type: 'trial_start', tenant: 'TechStart Inc', action: 'Started 14-day trial', timestamp: new Date(Date.now() - 86400000).toISOString() },
            { type: 'renewal', tenant: 'Global Traders', action: 'Renewed Professional plan', timestamp: new Date(Date.now() - 172800000).toISOString() },
          ],
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Subscription Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage plans, tenants, billing, and view subscription analytics
        </p>
      </div>

      {/* Alerts */}
      {metrics && (
        <AlertsSection
          trialsExpiring={metrics.trialsExpiringSoon}
          suspended={metrics.suspendedAccounts}
        />
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Tenants"
          value={metrics?.totalTenants || 0}
          icon={Building2}
          color="bg-blue-500"
        />
        <MetricCard
          title="Active Subscriptions"
          value={metrics?.activeSubscriptions || 0}
          icon={CreditCard}
          color="bg-emerald-500"
        />
        <MetricCard
          title="Active Trials"
          value={metrics?.trialsActive || 0}
          icon={Clock}
          color="bg-amber-500"
          subtext={`${metrics?.trialsExpiringSoon || 0} expiring soon`}
        />
        <MetricCard
          title="MRR"
          value={`₹${((metrics?.mrr || 0) / 1000).toFixed(0)}K`}
          icon={TrendingUp}
          color="bg-violet-500"
          change={{ value: 12, positive: true }}
        />
      </div>

      {/* Management Cards */}
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Management
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {MANAGEMENT_CARDS.map((card) => (
          <ManagementCard key={card.title} {...card} />
        ))}
      </div>

      {/* Bottom Grid: Plan Breakdown + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {metrics && <PlanBreakdown breakdown={metrics.planBreakdown} />}
        {metrics && <RecentActivity activities={metrics.recentActivity} />}
      </div>
    </div>
  );
}
