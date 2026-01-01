'use client';

import React from 'react';
import { 
  Crown, 
  Calendar, 
  ArrowUpCircle, 
  Users, 
  CheckSquare, 
  FileText, 
  HardDrive,
  Building2,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { UsageMeter } from './UsageMeter';

export interface ResourceUsage {
  users: { used: number; allowed: number | 'unlimited' };
  tasks?: { used: number; allowed: number | 'unlimited' };
  approvals?: { used: number; allowed: number | 'unlimited' };
  reports?: { used: number; allowed: number | 'unlimited' };
  storage?: { used: number; allowed: number | 'unlimited'; unit?: string };
  branches?: { used: number; allowed: number | 'unlimited' };
}

export interface SubscriptionInfo {
  planName: string;
  billingType: 'monthly' | 'annual' | 'lifetime' | 'trial';
  status: 'active' | 'trial' | 'expiring' | 'expired' | 'cancelled';
  renewalDate?: string;
  trialEndsAt?: string;
  daysRemaining?: number;
}

export interface PendingIndicators {
  usersBlocked?: number;
  approvalsBlocked?: number;
  message?: string;
}

export interface SubscriptionOverviewProps {
  subscription: SubscriptionInfo;
  usage: ResourceUsage;
  pending?: PendingIndicators;
  onUpgrade?: () => void;
  onViewSubscription?: () => void;
  loading?: boolean;
}

/**
 * SubscriptionOverview Component
 * 
 * Displays subscription plan info and resource utilization grid.
 * Placed immediately below header to ensure admins see limits before user actions.
 */
export function SubscriptionOverview({
  subscription,
  usage,
  pending,
  onUpgrade,
  onViewSubscription,
  loading = false,
}: SubscriptionOverviewProps) {
  const getStatusBadge = () => {
    switch (subscription.status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        );
      case 'trial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            <Clock className="w-3 h-3" />
            Trial {subscription.daysRemaining ? `(${subscription.daysRemaining} days left)` : ''}
          </span>
        );
      case 'expiring':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-3 h-3" />
            Expiring Soon
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
            <AlertTriangle className="w-3 h-3" />
            Expired
          </span>
        );
      default:
        return null;
    }
  };

  const formatBillingType = () => {
    switch (subscription.billingType) {
      case 'monthly': return 'Billed Monthly';
      case 'annual': return 'Billed Annually';
      case 'lifetime': return 'Lifetime Access';
      case 'trial': return 'Free Trial';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Subscription Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left - Plan Info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {subscription.planName}
                </h3>
                {getStatusBadge()}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatBillingType()}
              </p>
            </div>
          </div>

          {/* Right - Actions & Renewal */}
          <div className="flex items-center gap-4">
            {subscription.renewalDate && (
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Renewal Date</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(subscription.renewalDate).toLocaleDateString()}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              {onViewSubscription && (
                <button
                  onClick={onViewSubscription}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  View Details
                </button>
              )}
              {onUpgrade && (
                <button
                  onClick={onUpgrade}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all shadow-sm hover:shadow"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  Upgrade Plan
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resource Utilization Grid */}
      <div className="p-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Resource Utilization
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Users */}
          <UsageMeter
            resourceName="Users"
            used={usage.users.used}
            allowed={usage.users.allowed}
            icon={<Users className="w-4 h-4" />}
          />

          {/* Tasks */}
          {usage.tasks && (
            <UsageMeter
              resourceName="Tasks"
              used={usage.tasks.used}
              allowed={usage.tasks.allowed}
              icon={<CheckSquare className="w-4 h-4" />}
            />
          )}

          {/* Approvals */}
          {usage.approvals && (
            <UsageMeter
              resourceName="Approvals"
              used={usage.approvals.used}
              allowed={usage.approvals.allowed}
              icon={<FileText className="w-4 h-4" />}
            />
          )}

          {/* Reports */}
          {usage.reports && (
            <UsageMeter
              resourceName="Reports Download"
              used={usage.reports.used}
              allowed={usage.reports.allowed}
              icon={<FileText className="w-4 h-4" />}
            />
          )}

          {/* Storage */}
          {usage.storage && (
            <UsageMeter
              resourceName="Storage"
              used={usage.storage.used}
              allowed={usage.storage.allowed}
              unit={usage.storage.unit || ' GB'}
              icon={<HardDrive className="w-4 h-4" />}
            />
          )}

          {/* Branches */}
          {usage.branches && (
            <UsageMeter
              resourceName="Branches"
              used={usage.branches.used}
              allowed={usage.branches.allowed}
              icon={<Building2 className="w-4 h-4" />}
            />
          )}
        </div>
      </div>

      {/* Pending/Blocked Indicators */}
      {pending && (pending.usersBlocked || pending.approvalsBlocked || pending.message) && (
        <div className="px-6 py-3 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">
              {pending.message || (
                <>
                  {pending.usersBlocked && `${pending.usersBlocked} users cannot be created (limit reached). `}
                  {pending.approvalsBlocked && `Approvals blocked for ${pending.approvalsBlocked} users.`}
                </>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubscriptionOverview;
