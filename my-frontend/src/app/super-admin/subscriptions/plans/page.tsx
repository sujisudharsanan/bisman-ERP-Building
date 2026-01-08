'use client';

/**
 * SuperAdmin - Plan Management
 * 
 * Features:
 * - View all subscription plans
 * - Edit plan features and limits
 * - Create custom plans
 * - Manage feature flags per plan
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Save,
  Loader2,
  Star,
  Zap,
  Crown,
  Building2,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Users,
  HardDrive,
  Activity,
  AlertTriangle,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  limit?: number;
}

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean;
  isCustom: boolean;
  sortOrder: number;
  limits: {
    users: number;
    storage: number; // GB
    apiCalls: number;
    integrations: number;
  };
  features: FeatureFlag[];
  tenantCount: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PLAN_ICONS: Record<string, React.ElementType> = {
  STARTER: Star,
  PROFESSIONAL: Zap,
  BUSINESS: Crown,
  ENTERPRISE: Building2,
};

const PLAN_COLORS: Record<string, string> = {
  STARTER: 'bg-blue-500',
  PROFESSIONAL: 'bg-violet-500',
  BUSINESS: 'bg-amber-500',
  ENTERPRISE: 'bg-emerald-500',
};

const DEFAULT_FEATURES: FeatureFlag[] = [
  { id: 'CUSTOM_ROLES', name: 'Custom Roles', description: 'Create custom permission roles', enabled: false },
  { id: 'MAKER_CHECKER', name: 'Maker-Checker Workflow', description: 'Dual approval for sensitive operations', enabled: false },
  { id: 'AUTOMATION_RULES', name: 'Automation Rules', description: 'Automated workflows and triggers', enabled: false },
  { id: 'API_ACCESS', name: 'API Access', description: 'REST API for integrations', enabled: false },
  { id: 'AUDIT_EXPORT', name: 'Audit Export', description: 'Export audit logs to external systems', enabled: false },
  { id: 'REALTIME_SOCKET', name: 'Real-time Sync', description: 'Live data synchronization', enabled: false },
  { id: 'REPORT_BUILDER', name: 'Report Builder', description: 'Custom report creation', enabled: false },
  { id: 'COMPLIANCE_MODULE', name: 'Compliance Module', description: 'Regulatory compliance tools', enabled: false },
  { id: 'WHITE_LABEL', name: 'White Label', description: 'Custom branding options', enabled: false },
  { id: 'SSO', name: 'Single Sign-On', description: 'SAML/OAuth SSO integration', enabled: false },
  { id: 'MULTI_ENTITY', name: 'Multi-Entity', description: 'Multiple business entities', enabled: false },
];

// ============================================================================
// COMPONENTS
// ============================================================================

// Plan Card Component
function PlanCard({
  plan,
  onEdit,
  onDelete,
  expanded,
  onToggleExpand,
}: {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onDelete: (planId: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const Icon = PLAN_ICONS[plan.name] || Package;
  const color = PLAN_COLORS[plan.name] || 'bg-gray-500';

  return (
    <motion.div
      layout
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden"
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{plan.displayName}</h3>
              {!plan.isActive && (
                <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 rounded">
                  Inactive
                </span>
              )}
              {plan.isCustom && (
                <span className="px-2 py-0.5 text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded">
                  Custom
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {plan.monthlyPrice > 0 ? `₹${plan.monthlyPrice.toLocaleString()}` : 'Custom'}
            </p>
            <p className="text-sm text-gray-500">/month</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {plan.tenantCount} tenant{plan.tenantCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg">
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200 dark:border-slate-700 overflow-hidden"
          >
            <div className="p-4">
              {/* Limits */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Plan Limits</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <Users className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Users</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {plan.limits.users === -1 ? 'Unlimited' : plan.limits.users}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <HardDrive className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Storage</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {plan.limits.storage === -1 ? 'Unlimited' : `${plan.limits.storage} GB`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <Activity className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">API Calls</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {plan.limits.apiCalls === -1 ? 'Unlimited' : `${(plan.limits.apiCalls / 1000).toFixed(0)}K`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <Package className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Integrations</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {plan.limits.integrations === -1 ? 'Unlimited' : plan.limits.integrations}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Feature Flags</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {plan.features.map((feature) => (
                    <div
                      key={feature.id}
                      className={`flex items-center gap-2 p-2 rounded-lg ${
                        feature.enabled
                          ? 'bg-emerald-50 dark:bg-emerald-900/20'
                          : 'bg-gray-50 dark:bg-slate-900'
                      }`}
                    >
                      {feature.enabled ? (
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-gray-400 shrink-0" />
                      )}
                      <span
                        className={`text-sm ${
                          feature.enabled
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={() => onEdit(plan)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600"
                >
                  <Edit className="w-4 h-4" />
                  Edit Plan
                </button>
                {plan.isCustom && plan.tenantCount === 0 && (
                  <button
                    onClick={() => onDelete(plan.id)}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 bg-white dark:bg-slate-700 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Edit Plan Modal
function EditPlanModal({
  plan,
  isOpen,
  onClose,
  onSave,
  isCreating,
}: {
  plan: Plan | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: Plan) => void;
  isCreating: boolean;
}) {
  const [formData, setFormData] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (plan) {
      setFormData({ ...plan });
    } else if (isCreating) {
      setFormData({
        id: '',
        name: '',
        displayName: '',
        description: '',
        monthlyPrice: 0,
        yearlyPrice: 0,
        isActive: true,
        isCustom: true,
        sortOrder: 100,
        limits: { users: 10, storage: 10, apiCalls: 10000, integrations: 5 },
        features: DEFAULT_FEATURES.map((f) => ({ ...f })),
        tenantCount: 0,
      });
    }
  }, [plan, isCreating]);

  if (!isOpen || !formData) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = (featureId: string) => {
    setFormData({
      ...formData,
      features: formData.features.map((f) =>
        f.id === featureId ? { ...f, enabled: !f.enabled } : f
      ),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isCreating ? 'Create Custom Plan' : `Edit ${formData.displayName}`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Plan Name (ID)
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                disabled={!isCreating}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white disabled:opacity-50"
                placeholder="CUSTOM_PLAN"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                placeholder="Custom Plan"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
              placeholder="Plan description..."
            />
          </div>

          {/* Pricing */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Pricing
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Monthly Price (₹)</label>
                <input
                  type="number"
                  value={formData.monthlyPrice ?? ''}
                  onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Yearly Price (₹)</label>
                <input
                  type="number"
                  value={formData.yearlyPrice ?? ''}
                  onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Limits */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Limits (-1 = Unlimited)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Users</label>
                <input
                  type="number"
                  value={formData.limits.users ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      limits: { ...formData.limits, users: e.target.value === '' ? 0 : parseInt(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Storage (GB)</label>
                <input
                  type="number"
                  value={formData.limits.storage ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      limits: { ...formData.limits, storage: e.target.value === '' ? 0 : parseInt(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">API Calls</label>
                <input
                  type="number"
                  value={formData.limits.apiCalls ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      limits: { ...formData.limits, apiCalls: e.target.value === '' ? 0 : parseInt(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Integrations</label>
                <input
                  type="number"
                  value={formData.limits.integrations ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      limits: { ...formData.limits, integrations: e.target.value === '' ? 0 : parseInt(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Feature Flags */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Feature Flags
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {formData.features.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => toggleFeature(feature.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    feature.enabled
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                      : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-600'
                  }`}
                >
                  <div className="text-left">
                    <p
                      className={`font-medium ${
                        feature.enabled
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {feature.name}
                    </p>
                    <p className="text-xs text-gray-500">{feature.description}</p>
                  </div>
                  {feature.enabled ? (
                    <ToggleRight className="w-6 h-6 text-emerald-500 shrink-0" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-violet-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Plan is active</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-800 flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.name || !formData.displayName}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            {isCreating ? 'Create Plan' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function PlanManagementPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/super-admin/subscriptions/plans', {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setPlans(data.plans || []);
    } catch {
      console.error('Error fetching plans');
      // Mock data for development
      setPlans([
        {
          id: '1',
          name: 'STARTER',
          displayName: 'Starter',
          description: 'For small businesses getting started',
          monthlyPrice: 2999,
          yearlyPrice: 28790,
          isActive: true,
          isCustom: false,
          sortOrder: 1,
          limits: { users: 5, storage: 5, apiCalls: 10000, integrations: 2 },
          features: DEFAULT_FEATURES.map((f, i) => ({ ...f, enabled: i < 2 })),
          tenantCount: 45,
        },
        {
          id: '2',
          name: 'PROFESSIONAL',
          displayName: 'Professional',
          description: 'For growing businesses with more needs',
          monthlyPrice: 9999,
          yearlyPrice: 95990,
          isActive: true,
          isCustom: false,
          sortOrder: 2,
          limits: { users: 25, storage: 25, apiCalls: 50000, integrations: 10 },
          features: DEFAULT_FEATURES.map((f, i) => ({ ...f, enabled: i < 5 })),
          tenantCount: 67,
        },
        {
          id: '3',
          name: 'BUSINESS',
          displayName: 'Business',
          description: 'For established businesses scaling up',
          monthlyPrice: 24999,
          yearlyPrice: 239990,
          isActive: true,
          isCustom: false,
          sortOrder: 3,
          limits: { users: 100, storage: 100, apiCalls: 200000, integrations: 25 },
          features: DEFAULT_FEATURES.map((f, i) => ({ ...f, enabled: i < 8 })),
          tenantCount: 28,
        },
        {
          id: '4',
          name: 'ENTERPRISE',
          displayName: 'Enterprise',
          description: 'For large organizations with custom needs',
          monthlyPrice: 0,
          yearlyPrice: 0,
          isActive: true,
          isCustom: false,
          sortOrder: 4,
          limits: { users: -1, storage: -1, apiCalls: -1, integrations: -1 },
          features: DEFAULT_FEATURES.map((f) => ({ ...f, enabled: true })),
          tenantCount: 12,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Handle save
  const handleSave = async (plan: Plan) => {
    try {
      const endpoint = isCreating
        ? '/api/super-admin/subscriptions/plans'
        : `/api/super-admin/subscriptions/plans/${plan.id}`;
      const method = isCreating ? 'POST' : 'PUT';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(plan),
      });

      if (!response.ok) throw new Error('Failed to save');

      fetchPlans();
    } catch (err) {
      console.error('Save error:', err);
      // For demo, just refresh
      fetchPlans();
    }
  };

  // Handle delete
  const handleDelete = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      const response = await fetch(`/api/super-admin/subscriptions/plans/${planId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to delete');

      fetchPlans();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete plan');
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plan Management</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage subscription plans and features
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreating(true);
            setEditingPlan(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
        >
          <Plus className="w-5 h-5" />
          Create Plan
        </button>
      </div>

      {/* Warning for editing standard plans */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Changes affect all tenants on that plan
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Modifying plan features or limits will immediately apply to all existing subscribers.
              Use billing overrides for tenant-specific changes.
            </p>
          </div>
        </div>
      </div>

      {/* Plans List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={(p) => {
                setIsCreating(false);
                setEditingPlan(p);
                setShowModal(true);
              }}
              onDelete={handleDelete}
              expanded={expandedPlan === plan.id}
              onToggleExpand={() =>
                setExpandedPlan(expandedPlan === plan.id ? null : plan.id)
              }
            />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <EditPlanModal
        plan={editingPlan}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingPlan(null);
          setIsCreating(false);
        }}
        onSave={handleSave}
        isCreating={isCreating}
      />
    </div>
  );
}
