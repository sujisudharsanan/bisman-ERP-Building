'use client';

/**
 * SuperAdmin Subscription Management Console
 * 
 * Features:
 * - Real data from API
 * - Sidebar navigation via layout
 * - Modal-based management (Plan Settings, etc.)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  RefreshCw,
  X,
  Plus,
  Edit2,
  Trash2,
  Check,
  ToggleLeft,
  ToggleRight,
  Star,
  Zap,
  Shield,
  Award,
  Save,
  HardDrive,
  GitBranch,
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
  mrr: number;
  churnRate: number;
  pendingRenewals: number;
  planBreakdown: Record<string, number>;
  tenantDistribution: Array<{ plan_code: string; count: number }>;
  expiringTrials: Array<{
    clientId: number;
    clientName: string;
    planCode: string;
    daysRemaining: number;
  }>;
  recentActivity: {
    type: string;
    tenant: string;
    action: string;
    timestamp: string;
  }[];
}

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxStorageGb: number;
  maxBranches: number;
  maxApiCallsDay: number;
  trialDays: number;
  isActive: boolean;
  isCustom: boolean;
  sortOrder: number;
  features: PlanFeature[];
  tenantCount: number;
}

interface PlanFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category?: string;
}

interface PlanFormData {
  code: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxStorageGb: number;
  maxBranches: number;
  maxApiCallsDay: number;
  trialDays: number;
  isActive: boolean;
  features: Record<string, boolean>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const PLAN_ICONS: Record<string, React.ElementType> = {
  BASIC: Star,
  STARTER: Star,
  STANDARD: Zap,
  PROFESSIONAL: Zap,
  PRO: Award,
  BUSINESS: Shield,
  ENTERPRISE: Building2,
};

const PLAN_COLORS: Record<string, string> = {
  BASIC: 'bg-gray-500',
  STARTER: 'bg-blue-500',
  STANDARD: 'bg-indigo-500',
  PROFESSIONAL: 'bg-violet-500',
  PRO: 'bg-purple-500',
  BUSINESS: 'bg-amber-500',
  ENTERPRISE: 'bg-emerald-500',
};

// Actual features available in BISMAN ERP - grouped by category
const DEFAULT_FEATURES = [
  // Access & Roles
  { id: 'CUSTOM_ROLES', name: 'Custom Roles', description: 'Create custom permission roles', category: 'Access' },
  { id: 'MAKER_CHECKER', name: 'Maker-Checker', description: 'Dual approval workflow for sensitive actions', category: 'Access' },
  
  // Workflow & Automation
  { id: 'AUTOMATION_RULES', name: 'Automation Rules', description: 'Create automated workflow rules', category: 'Workflow' },
  
  // Integrations
  { id: 'API_ACCESS', name: 'API Access', description: 'REST API integration access', category: 'Integration' },
  
  // Compliance & Audit
  { id: 'AUDIT_EXPORT', name: 'Audit Export', description: 'Export audit logs and reports', category: 'Compliance' },
  { id: 'COMPLIANCE_MODULE', name: 'Compliance Module', description: 'Full compliance management tools', category: 'Compliance' },
  
  // Real-time Features
  { id: 'REALTIME_SOCKET', name: 'Real-time Updates', description: 'Live data sync via WebSocket', category: 'Real-time' },
  
  // Analytics & Reports
  { id: 'REPORT_BUILDER', name: 'Report Builder', description: 'Custom report creation', category: 'Analytics' },
  { id: 'KPI_ANALYTICS', name: 'KPI Analytics', description: 'Key performance indicators tracking', category: 'Analytics' },
  { id: 'CUSTOM_DASHBOARDS', name: 'Custom Dashboards', description: 'Build custom dashboard views', category: 'Analytics' },
  
  // Enterprise Features
  { id: 'WHITE_LABEL', name: 'White Label', description: 'Custom branding and theming', category: 'Enterprise' },
  { id: 'SSO', name: 'Single Sign-On', description: 'SAML/OAuth SSO integration', category: 'Enterprise' },
  { id: 'MULTI_ENTITY', name: 'Multi-Entity', description: 'Manage multiple business entities', category: 'Enterprise' },
  { id: 'IP_RESTRICTIONS', name: 'IP Restrictions', description: 'Whitelist allowed IP addresses', category: 'Enterprise' },
  { id: 'DEDICATED_SUPPORT', name: 'Dedicated Support', description: 'Priority 24/7 support', category: 'Enterprise' },
  
  // Modules
  { id: 'BASIC_FINANCE', name: 'Basic Finance', description: 'Core financial management', category: 'Modules' },
  { id: 'ADVANCED_FINANCE', name: 'Advanced Finance', description: 'Advanced financial tools', category: 'Modules' },
  { id: 'COST_CENTERS', name: 'Cost Centers', description: 'Cost center tracking', category: 'Modules' },
  { id: 'TASK_MANAGEMENT', name: 'Task Management', description: 'Task & project management', category: 'Modules' },
  { id: 'OPERATIONS_DASHBOARD', name: 'Operations Dashboard', description: 'Operations overview', category: 'Modules' },
  { id: 'LEGAL_MODULE', name: 'Legal Module', description: 'Legal document management', category: 'Modules' },
  
  // Notifications
  { id: 'EMAIL_NOTIFICATIONS', name: 'Email Notifications', description: 'Email alerts and updates', category: 'Notifications' },
  { id: 'CHAT_NOTIFICATIONS', name: 'Chat Notifications', description: 'In-app chat notifications', category: 'Notifications' },
  
  // Backup
  { id: 'DAILY_BACKUP', name: 'Daily Backup', description: 'Automatic daily backups', category: 'Infrastructure' },
  { id: 'WEEKLY_BACKUP', name: 'Weekly Backup', description: 'Weekly backup retention', category: 'Infrastructure' },
  { id: 'HOURLY_BACKUP', name: 'Hourly Backup', description: 'Hourly backup (Enterprise)', category: 'Infrastructure' },
];

// ============================================================================
// METRIC CARD COMPONENT
// ============================================================================

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
      className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-700"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${change.positive ? 'text-emerald-600' : 'text-red-600'}`}>
              {change.positive ? '+' : ''}{change.value}% from last month
            </p>
          )}
          {subtext && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtext}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// PLAN CARD COMPONENT
// ============================================================================

function PlanCard({
  plan,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  plan: SubscriptionPlan;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const Icon = PLAN_ICONS[plan.code] || Package;
  const color = PLAN_COLORS[plan.code] || 'bg-gray-500';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border-2 ${
        plan.isActive ? 'border-gray-200 dark:border-slate-700' : 'border-red-300 dark:border-red-800 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
            <p className="text-xs text-gray-500">{plan.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleStatus}
            className={`p-1.5 rounded-lg transition-colors ${
              plan.isActive 
                ? 'text-emerald-600 hover:bg-emerald-50' 
                : 'text-gray-400 hover:bg-gray-50'
            }`}
            title={plan.isActive ? 'Deactivate' : 'Activate'}
          >
            {plan.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
          {plan.isCustom && (
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
        {plan.description}
      </p>

      <div className="flex items-baseline gap-1 mb-4">
        {plan.priceMonthly > 0 ? (
          <>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              ₹{plan.priceMonthly.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500">/mo</span>
          </>
        ) : (
          <span className="text-lg font-semibold text-gray-900 dark:text-white">Custom Pricing</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Users className="w-4 h-4" />
          <span>{plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers} users</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <HardDrive className="w-4 h-4" />
          <span>{plan.maxStorageGb === -1 ? 'Unlimited' : `${plan.maxStorageGb}GB`}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <GitBranch className="w-4 h-4" />
          <span>{plan.maxBranches === -1 ? 'Unlimited' : plan.maxBranches} branches</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span>{plan.trialDays} days trial</span>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Active tenants</span>
          <span className="font-medium text-gray-900 dark:text-white">{plan.tenantCount}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// PLAN EDIT MODAL
// ============================================================================

function PlanEditModal({
  plan,
  isOpen,
  onClose,
  onSave,
  isCreating,
}: {
  plan: PlanFormData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PlanFormData) => Promise<void>;
  isCreating: boolean;
}) {
  const [formData, setFormData] = useState<PlanFormData>({
    code: '',
    name: '',
    description: '',
    priceMonthly: 0,
    priceYearly: 0,
    maxUsers: 10,
    maxStorageGb: 10,
    maxBranches: 1,
    maxApiCallsDay: 1000,
    trialDays: 14,
    isActive: true,
    features: {},
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (plan) {
      setFormData(plan);
    } else {
      setFormData({
        code: '',
        name: '',
        description: '',
        priceMonthly: 0,
        priceYearly: 0,
        maxUsers: 10,
        maxStorageGb: 10,
        maxBranches: 1,
        maxApiCallsDay: 1000,
        trialDays: 14,
        isActive: true,
        features: {},
      });
    }
    setError(null);
  }, [plan, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {isCreating ? 'Create New Plan' : 'Edit Plan'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      // Auto-generate code from name (only when creating new plan)
                      const autoCode = isCreating 
                        ? name.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
                        : formData.code;
                      setFormData({ ...formData, name, code: autoCode });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    placeholder="e.g., Professional Plus"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Plan Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                    disabled={!isCreating}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 disabled:opacity-50 font-mono text-sm"
                    placeholder="AUTO_GENERATED"
                    required
                  />
                  {isCreating && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Auto-generated from name. You can edit if needed.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  rows={2}
                  placeholder="Plan description"
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Monthly Price (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.priceMonthly}
                    onChange={(e) => setFormData({ ...formData, priceMonthly: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Yearly Price (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.priceYearly}
                    onChange={(e) => setFormData({ ...formData, priceYearly: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    min="0"
                  />
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Users
                  </label>
                  <input
                    type="number"
                    value={formData.maxUsers}
                    onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    min="-1"
                    placeholder="-1 for unlimited"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Storage (GB)
                  </label>
                  <input
                    type="number"
                    value={formData.maxStorageGb}
                    onChange={(e) => setFormData({ ...formData, maxStorageGb: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    min="-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Branches
                  </label>
                  <input
                    type="number"
                    value={formData.maxBranches}
                    onChange={(e) => setFormData({ ...formData, maxBranches: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    min="-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Trial Days
                  </label>
                  <input
                    type="number"
                    value={formData.trialDays}
                    onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    min="0"
                  />
                </div>
              </div>

              {/* Features - Grouped by Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Features
                </label>
                <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                  {/* Group features by category */}
                  {Object.entries(
                    DEFAULT_FEATURES.reduce((acc, feature) => {
                      const cat = feature.category || 'Other';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(feature);
                      return acc;
                    }, {} as Record<string, typeof DEFAULT_FEATURES>)
                  ).map(([category, features]) => (
                    <div key={category}>
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        {category}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {features.map((feature) => (
                          <label
                            key={feature.id}
                            className="flex items-center gap-2 p-2 border border-gray-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700"
                            title={feature.description}
                          >
                            <input
                              type="checkbox"
                              checked={formData.features[feature.id] || false}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  features: { ...formData.features, [feature.id]: e.target.checked },
                                })
                              }
                              className="w-4 h-4 text-violet-600 rounded"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{feature.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-violet-600 rounded"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
                  Plan is active and visible to users
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isCreating ? 'Create Plan' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function SubscriptionManagementPage() {
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'plans'>('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanFormData | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/super-admin/subscriptions/metrics`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.metrics) {
          const apiMetrics = data.metrics;
          // Transform API response to match our interface
          const transformedMetrics: SubscriptionMetrics = {
            totalTenants: apiMetrics.totalTenants || 0,
            activeSubscriptions: apiMetrics.activeSubscriptions || 0,
            trialsActive: (apiMetrics.expiringTrials || []).length,
            trialsExpiringSoon: (apiMetrics.expiringTrials || []).filter(
              (t: { daysRemaining: number }) => t.daysRemaining <= 3
            ).length,
            suspendedAccounts: 0,  // Not tracked in API yet
            mrr: apiMetrics.mrr || 0,
            churnRate: apiMetrics.churnRate || 0,
            pendingRenewals: apiMetrics.pendingRenewals || 0,
            planBreakdown: (apiMetrics.tenantDistribution || []).reduce(
              (acc: Record<string, number>, item: { plan_code: string; count: number }) => {
                acc[item.plan_code?.toLowerCase() || 'unknown'] = item.count;
                return acc;
              },
              {}
            ),
            tenantDistribution: apiMetrics.tenantDistribution || [],
            expiringTrials: apiMetrics.expiringTrials || [],
            recentActivity: (apiMetrics.recentActivities || []).map(
              (a: { clientName: string; action: string; changedAt: string }) => ({
                type: 'subscription',
                tenant: a.clientName,
                action: a.action,
                timestamp: a.changedAt,
              })
            ),
          };
          setMetrics(transformedMetrics);
        }
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  }, []);

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/super-admin/subscriptions/plans`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.plans) {
          // Transform snake_case API response to camelCase for frontend
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const transformedPlans = data.plans.map((p: any) => ({
            id: String(p.id),
            code: p.plan_code || p.code || '',
            name: p.name || '',
            description: p.description || '',
            priceMonthly: p.price_monthly || 0,
            priceYearly: p.price_yearly || 0,
            maxUsers: p.max_users || 10,
            maxStorageGb: p.max_storage_gb || 10,
            maxBranches: p.max_branches || 1,
            maxApiCallsDay: p.max_api_calls_day || 1000,
            trialDays: p.trial_days || 14,
            isActive: p.is_active ?? true,
            isCustom: p.is_custom ?? false,
            sortOrder: p.sort_order || 0,
            features: Object.entries(p.feature_flags || {}).map(([key, enabled]) => ({
              id: key,
              name: key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
              description: '',
              enabled: Boolean(enabled),
            })),
            tenantCount: p.subscriber_count || (p['_count'] && p['_count']['subscriptions']) || 0,
          }));
          setPlans(transformedPlans);
        }
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchMetrics(), fetchPlans()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchMetrics, fetchPlans]);

  // Handle plan save
  const handleSavePlan = async (data: PlanFormData) => {
    const url = isCreating
      ? `${API_BASE}/api/super-admin/subscriptions/plans`
      : `${API_BASE}/api/super-admin/subscriptions/plans/${data.code}`;
    const method = isCreating ? 'POST' : 'PUT';

    const response = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_code: data.code,
        name: data.name,
        description: data.description,
        price_monthly: data.priceMonthly,
        price_yearly: data.priceYearly,
        max_users: data.maxUsers,
        max_storage_gb: data.maxStorageGb,
        max_branches: data.maxBranches,
        max_api_calls_day: data.maxApiCallsDay,
        trial_days: data.trialDays,
        is_active: data.isActive,
        feature_flags: data.features,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to save plan');
    }

    await fetchPlans();
  };

  // Handle toggle status
  const handleToggleStatus = async (plan: SubscriptionPlan) => {
    try {
      await fetch(`${API_BASE}/api/super-admin/subscriptions/plans/${plan.id}/toggle`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      await fetchPlans();
    } catch (error) {
      console.error('Error toggling plan status:', error);
    }
  };

  // Handle delete
  const handleDeletePlan = async (plan: SubscriptionPlan) => {
    if (!confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return;
    
    try {
      await fetch(`${API_BASE}/api/super-admin/subscriptions/plans/${plan.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  // Open edit modal
  const openEditModal = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan({
        code: plan.code,
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        maxUsers: plan.maxUsers,
        maxStorageGb: plan.maxStorageGb,
        maxBranches: plan.maxBranches,
        maxApiCallsDay: plan.maxApiCallsDay,
        trialDays: plan.trialDays,
        isActive: plan.isActive,
        features: plan.features.reduce((acc, f) => ({ ...acc, [f.id]: f.enabled }), {}),
      });
      setIsCreating(false);
    } else {
      setEditingPlan(null);
      setIsCreating(true);
    }
    setEditModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  // Calculate plan breakdown from actual plans
  const planBreakdown = plans.reduce((acc, plan) => {
    acc[plan.code.toLowerCase()] = plan.tenantCount || 0;
    return acc;
  }, {} as Record<string, number>);

  const totalTenants = Object.values(planBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Subscription Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage plans, tenants, billing, and view subscription analytics
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6 border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-violet-600 border-b-2 border-violet-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'plans'
              ? 'text-violet-600 border-b-2 border-violet-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Plans
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Alerts */}
          {(metrics?.trialsExpiringSoon || 0) > 0 || (metrics?.suspendedAccounts || 0) > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {(metrics?.trialsExpiringSoon || 0) > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        {metrics?.trialsExpiringSoon} trials expiring soon
                      </p>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Review and reach out to convert them
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {(metrics?.suspendedAccounts || 0) > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-200">
                        {metrics?.suspendedAccounts} suspended accounts
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Review for payment issues or violations
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Total Tenants"
              value={metrics?.totalTenants || totalTenants}
              icon={Building2}
              color="bg-blue-500"
            />
            <MetricCard
              title="Active Subscriptions"
              value={metrics?.activeSubscriptions || totalTenants}
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

          {/* Plan Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Plan Distribution</h3>
            <div className="space-y-3">
              {plans.filter(p => p.isActive).map((plan) => {
                const total = plans.reduce((acc, p) => acc + (p.tenantCount || 0), 0);
                const percentage = total > 0 ? Math.round((plan.tenantCount / total) * 100) : 0;
                return (
                  <div key={plan.code}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{plan.name}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {plan.tenantCount} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className={`h-full ${PLAN_COLORS[plan.code] || 'bg-gray-500'} rounded-full`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          {metrics?.recentActivity && metrics.recentActivity.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {metrics.recentActivity.slice(0, 5).map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
                      <Activity className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-medium">{activity.tenant}</span>
                      </p>
                      <p className="text-xs text-gray-500">{activity.action}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <>
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600 dark:text-gray-400">
              {plans.length} plan{plans.length !== 1 ? 's' : ''} configured
            </p>
            <button
              onClick={() => openEditModal()}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Plan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                onEdit={() => openEditModal(plan)}
                onToggleStatus={() => handleToggleStatus(plan)}
                onDelete={() => handleDeletePlan(plan)}
              />
            ))}
          </div>
        </>
      )}

      {/* Edit Modal */}
      <PlanEditModal
        plan={editingPlan}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSavePlan}
        isCreating={isCreating}
      />
    </div>
  );
}
