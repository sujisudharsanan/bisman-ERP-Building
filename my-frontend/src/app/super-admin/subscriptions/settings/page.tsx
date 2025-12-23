'use client';

/**
 * Subscription Plans Management Page
 * 
 * Features:
 * - View all subscription plans with real data
 * - Add new subscription plans
 * - Edit existing plans (pricing, limits, features)
 * - Toggle plan active/inactive status
 * - Delete custom plans
 * - Plans are used in Admin Creation workflow
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  FiPackage,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiSave,
  FiUsers,
  FiHardDrive,
  FiZap,
  FiGitBranch,
  FiDollarSign,
  FiCalendar,
  FiToggleLeft,
  FiToggleRight,
  FiArrowLeft,
  FiAlertCircle,
  FiStar,
  FiAward,
  FiShield,
  FiBriefcase,
  FiRefreshCw,
  FiCopy,
  FiEye,
  FiActivity,
  FiCheckCircle,
} from 'react-icons/fi';

// ============================================================================
// TYPES
// ============================================================================

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
  createdAt?: string;
  updatedAt?: string;
}

interface PlanFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
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

const PLAN_ICONS: Record<string, React.ElementType> = {
  BASIC: FiStar,
  STARTER: FiStar,
  STANDARD: FiZap,
  PROFESSIONAL: FiZap,
  PRO: FiAward,
  BUSINESS: FiShield,
  ENTERPRISE: FiBriefcase,
};

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  BASIC: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  STARTER: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  STANDARD: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  PROFESSIONAL: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
  PRO: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  BUSINESS: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  ENTERPRISE: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
};

const DEFAULT_FEATURES: PlanFeature[] = [
  { id: 'CUSTOM_ROLES', name: 'Custom Roles', description: 'Create custom permission roles', enabled: false },
  { id: 'MAKER_CHECKER', name: 'Maker-Checker Workflow', description: 'Dual approval for sensitive operations', enabled: false },
  { id: 'AUTOMATION_RULES', name: 'Automation Rules', description: 'Automated workflows and triggers', enabled: false },
  { id: 'API_ACCESS', name: 'API Access', description: 'REST API for integrations', enabled: false },
  { id: 'AUDIT_EXPORT', name: 'Audit Export', description: 'Export audit logs to external systems', enabled: false },
  { id: 'REALTIME_SYNC', name: 'Real-time Sync', description: 'Live data synchronization', enabled: false },
  { id: 'REPORT_BUILDER', name: 'Report Builder', description: 'Custom report creation', enabled: false },
  { id: 'COMPLIANCE_MODULE', name: 'Compliance Module', description: 'Regulatory compliance tools', enabled: false },
  { id: 'WHITE_LABEL', name: 'White Label', description: 'Custom branding options', enabled: false },
  { id: 'SSO', name: 'Single Sign-On', description: 'SAML/OAuth SSO integration', enabled: false },
  { id: 'MULTI_BRANCH', name: 'Multi-Branch', description: 'Multiple branch locations', enabled: false },
  { id: 'PRIORITY_SUPPORT', name: 'Priority Support', description: '24/7 dedicated support', enabled: false },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (amount: number): string => {
  if (amount === 0) return 'Custom';
  return `₹${amount.toLocaleString('en-IN')}`;
};

const formatLimit = (value: number): string => {
  if (value === -1) return 'Unlimited';
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
};

// ============================================================================
// PLAN CARD COMPONENT
// ============================================================================

function PlanCard({
  plan,
  onEdit,
  onDelete,
  onToggleStatus,
  onDuplicate,
}: {
  plan: SubscriptionPlan;
  onEdit: (plan: SubscriptionPlan) => void;
  onDelete: (planId: string) => void;
  onToggleStatus: (planId: string, isActive: boolean) => void;
  onDuplicate: (plan: SubscriptionPlan) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = PLAN_ICONS[plan.code] || FiPackage;
  const colors = PLAN_COLORS[plan.code] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };

  const enabledFeatures = plan.features.filter((f) => f.enabled).length;
  const totalFeatures = plan.features.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl border-2 ${
        plan.isActive ? colors.border : 'border-gray-200'
      } shadow-sm overflow-hidden transition-all hover:shadow-md`}
    >
      {/* Card Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${colors.bg}`}>
              <Icon className={`w-6 h-6 ${colors.text}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                {!plan.isActive && (
                  <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
                    Inactive
                  </span>
                )}
                {plan.isCustom && (
                  <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                    Custom
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(plan.priceMonthly)}
            </p>
            <p className="text-sm text-gray-500">/month</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <FiUsers className="w-4 h-4 mx-auto text-gray-400 mb-1" />
            <p className="text-sm font-medium text-gray-900">{formatLimit(plan.maxUsers)}</p>
            <p className="text-xs text-gray-500">Users</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <FiGitBranch className="w-4 h-4 mx-auto text-gray-400 mb-1" />
            <p className="text-sm font-medium text-gray-900">{formatLimit(plan.maxBranches)}</p>
            <p className="text-xs text-gray-500">Branches</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <FiHardDrive className="w-4 h-4 mx-auto text-gray-400 mb-1" />
            <p className="text-sm font-medium text-gray-900">
              {plan.maxStorageGb === -1 ? '∞' : `${plan.maxStorageGb}GB`}
            </p>
            <p className="text-xs text-gray-500">Storage</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <FiCalendar className="w-4 h-4 mx-auto text-gray-400 mb-1" />
            <p className="text-sm font-medium text-gray-900">{plan.trialDays}</p>
            <p className="text-xs text-gray-500">Trial Days</p>
          </div>
        </div>

        {/* Tenant Count & Features Summary */}
        <div className="flex items-center justify-between text-sm mb-4">
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              <span className="font-medium text-gray-900">{plan.tenantCount}</span> tenants
            </span>
            <span className="text-gray-600">
              <span className="font-medium text-gray-900">{enabledFeatures}</span>/{totalFeatures} features
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            {expanded ? 'Hide Details' : 'View Details'}
            <FiEye className="w-4 h-4" />
          </button>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-gray-200">
                {/* Pricing Details */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Pricing</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 mb-1">Monthly</p>
                      <p className="text-lg font-bold text-blue-700">{formatCurrency(plan.priceMonthly)}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-600 mb-1">Yearly (Save 17%)</p>
                      <p className="text-lg font-bold text-green-700">{formatCurrency(plan.priceYearly)}</p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Features</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {plan.features.map((feature) => (
                      <div
                        key={feature.id}
                        className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                          feature.enabled
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-50 text-gray-400'
                        }`}
                      >
                        {feature.enabled ? (
                          <FiCheck className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <FiX className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span className="truncate">{feature.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* API Calls */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <FiActivity className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatLimit(plan.maxApiCallsDay)} API calls/day
                      </p>
                      <p className="text-xs text-gray-500">Rate limit for integrations</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={() => onToggleStatus(plan.id, !plan.isActive)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              plan.isActive
                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                : 'text-green-700 bg-green-50 hover:bg-green-100'
            }`}
          >
            {plan.isActive ? (
              <>
                <FiToggleRight className="w-4 h-4" />
                Deactivate
              </>
            ) : (
              <>
                <FiToggleLeft className="w-4 h-4" />
                Activate
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDuplicate(plan)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Duplicate Plan"
            >
              <FiCopy className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(plan)}
              className="flex items-center gap-1 px-3 py-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
            >
              <FiEdit2 className="w-4 h-4" />
              Edit
            </button>
            {plan.isCustom && plan.tenantCount === 0 && (
              <button
                onClick={() => onDelete(plan.id)}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Plan"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// PLAN FORM MODAL
// ============================================================================

function PlanFormModal({
  plan,
  isOpen,
  onClose,
  onSave,
  isLoading,
}: {
  plan: SubscriptionPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PlanFormData, isNew: boolean) => void;
  isLoading: boolean;
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = plan !== null;

  // Initialize form data when modal opens
  useEffect(() => {
    if (plan) {
      const featuresMap: Record<string, boolean> = {};
      plan.features.forEach((f) => {
        featuresMap[f.id] = f.enabled;
      });

      setFormData({
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
        features: featuresMap,
      });
    } else {
      // Default for new plan
      const defaultFeatures: Record<string, boolean> = {};
      DEFAULT_FEATURES.forEach((f) => {
        defaultFeatures[f.id] = false;
      });

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
        features: defaultFeatures,
      });
    }
    setErrors({});
  }, [plan, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      let processedValue = value;
      if (name === 'code') {
        processedValue = value.toUpperCase().replace(/[^A-Z0-9_]/g, '');
      }
      setFormData((prev) => ({ ...prev, [name]: processedValue }));
    }

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFeatureToggle = (featureId: string) => {
    setFormData((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [featureId]: !prev.features[featureId],
      },
    }));
  };

  const handleUnlimitedToggle = (field: 'maxUsers' | 'maxStorageGb' | 'maxBranches' | 'maxApiCallsDay') => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field] === -1 ? 10 : -1,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code || formData.code.length < 2) {
      newErrors.code = 'Plan code must be at least 2 characters';
    }

    if (!formData.name || formData.name.length < 2) {
      newErrors.name = 'Plan name must be at least 2 characters';
    }

    if (!formData.description) {
      newErrors.description = 'Description is required';
    }

    if (formData.priceMonthly < 0) {
      newErrors.priceMonthly = 'Price cannot be negative';
    }

    if (formData.priceYearly < 0) {
      newErrors.priceYearly = 'Price cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData, !isEditing);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Edit Subscription Plan' : 'Create New Plan'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Plan Code *
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    disabled={isEditing && !plan?.isCustom}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase ${
                      errors.code ? 'border-red-500' : 'border-gray-300'
                    } ${isEditing && !plan?.isCustom ? 'bg-gray-100' : ''}`}
                    placeholder="PRO_PLUS"
                  />
                  {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Professional Plus"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={2}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Perfect for growing businesses with advanced needs"
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Pricing</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    <FiDollarSign className="w-4 h-4 inline mr-1" />
                    Monthly Price (₹)
                  </label>
                  <input
                    type="number"
                    name="priceMonthly"
                    value={formData.priceMonthly}
                    onChange={handleInputChange}
                    min="0"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.priceMonthly ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <p className="mt-1 text-xs text-gray-500">0 = Custom pricing</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Yearly Price (₹)
                  </label>
                  <input
                    type="number"
                    name="priceYearly"
                    value={formData.priceYearly}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Suggested: {formatCurrency(Math.round(formData.priceMonthly * 10))}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    <FiCalendar className="w-4 h-4 inline mr-1" />
                    Trial Days
                  </label>
                  <input
                    type="number"
                    name="trialDays"
                    value={formData.trialDays}
                    onChange={handleInputChange}
                    min="0"
                    max="90"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Limits */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Plan Limits</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Users */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FiUsers className="w-4 h-4" />
                      Max Users
                    </label>
                    <button
                      type="button"
                      onClick={() => handleUnlimitedToggle('maxUsers')}
                      className={`text-xs px-2 py-1 rounded ${
                        formData.maxUsers === -1
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {formData.maxUsers === -1 ? 'Unlimited ✓' : 'Set Unlimited'}
                    </button>
                  </div>
                  {formData.maxUsers !== -1 && (
                    <input
                      type="number"
                      name="maxUsers"
                      value={formData.maxUsers}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                {/* Branches */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FiGitBranch className="w-4 h-4" />
                      Max Branches
                    </label>
                    <button
                      type="button"
                      onClick={() => handleUnlimitedToggle('maxBranches')}
                      className={`text-xs px-2 py-1 rounded ${
                        formData.maxBranches === -1
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {formData.maxBranches === -1 ? 'Unlimited ✓' : 'Set Unlimited'}
                    </button>
                  </div>
                  {formData.maxBranches !== -1 && (
                    <input
                      type="number"
                      name="maxBranches"
                      value={formData.maxBranches}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                {/* Storage */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FiHardDrive className="w-4 h-4" />
                      Max Storage (GB)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleUnlimitedToggle('maxStorageGb')}
                      className={`text-xs px-2 py-1 rounded ${
                        formData.maxStorageGb === -1
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {formData.maxStorageGb === -1 ? 'Unlimited ✓' : 'Set Unlimited'}
                    </button>
                  </div>
                  {formData.maxStorageGb !== -1 && (
                    <input
                      type="number"
                      name="maxStorageGb"
                      value={formData.maxStorageGb}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                {/* API Calls */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FiActivity className="w-4 h-4" />
                      API Calls/Day
                    </label>
                    <button
                      type="button"
                      onClick={() => handleUnlimitedToggle('maxApiCallsDay')}
                      className={`text-xs px-2 py-1 rounded ${
                        formData.maxApiCallsDay === -1
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {formData.maxApiCallsDay === -1 ? 'Unlimited ✓' : 'Set Unlimited'}
                    </button>
                  </div>
                  {formData.maxApiCallsDay !== -1 && (
                    <input
                      type="number"
                      name="maxApiCallsDay"
                      value={formData.maxApiCallsDay}
                      onChange={handleInputChange}
                      min="0"
                      step="1000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Feature Flags</h3>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_FEATURES.map((feature) => (
                  <button
                    key={feature.id}
                    type="button"
                    onClick={() => handleFeatureToggle(feature.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                      formData.features[feature.id]
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center ${
                        formData.features[feature.id]
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {formData.features[feature.id] && <FiCheck className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{feature.name}</p>
                      <p className="text-xs text-gray-500 truncate">{feature.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Status */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Active Plan</span>
                  <p className="text-sm text-gray-500">
                    Active plans are available for selection during admin creation
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <FiRefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FiSave className="w-4 h-4" />
                  {isEditing ? 'Update Plan' : 'Create Plan'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function SubscriptionPlansSettingsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${baseURL}/api/subscription-plans`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription plans');
      }

      const data = await response.json();
      if (data.ok && data.plans) {
        setPlans(data.plans);
      } else {
        // Use fallback data for development
        setPlans(getFallbackPlans());
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError(err instanceof Error ? err.message : 'Failed to load plans');
      // Use fallback data
      setPlans(getFallbackPlans());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Fallback plans for development
  const getFallbackPlans = (): SubscriptionPlan[] => [
    {
      id: '1',
      code: 'BASIC',
      name: 'Basic',
      description: 'Essential features for small teams',
      priceMonthly: 999,
      priceYearly: 9990,
      maxUsers: 5,
      maxStorageGb: 5,
      maxBranches: 1,
      maxApiCallsDay: 0,
      trialDays: 7,
      isActive: true,
      isCustom: false,
      sortOrder: 1,
      tenantCount: 45,
      features: DEFAULT_FEATURES.map((f, idx) => ({ ...f, enabled: idx < 3 })),
    },
    {
      id: '2',
      code: 'STANDARD',
      name: 'Standard',
      description: 'Advanced features for growing teams',
      priceMonthly: 2999,
      priceYearly: 29990,
      maxUsers: 25,
      maxStorageGb: 50,
      maxBranches: 5,
      maxApiCallsDay: 10000,
      trialDays: 14,
      isActive: true,
      isCustom: false,
      sortOrder: 2,
      tenantCount: 67,
      features: DEFAULT_FEATURES.map((f, idx) => ({ ...f, enabled: idx < 6 })),
    },
    {
      id: '3',
      code: 'PRO',
      name: 'Professional',
      description: 'Full-featured solution for established businesses',
      priceMonthly: 9999,
      priceYearly: 99990,
      maxUsers: 100,
      maxStorageGb: 200,
      maxBranches: 20,
      maxApiCallsDay: 50000,
      trialDays: 14,
      isActive: true,
      isCustom: false,
      sortOrder: 3,
      tenantCount: 28,
      features: DEFAULT_FEATURES.map((f, idx) => ({ ...f, enabled: idx < 9 })),
    },
    {
      id: '4',
      code: 'ENTERPRISE',
      name: 'Enterprise',
      description: 'Unlimited features for large organizations',
      priceMonthly: 0,
      priceYearly: 0,
      maxUsers: -1,
      maxStorageGb: -1,
      maxBranches: -1,
      maxApiCallsDay: -1,
      trialDays: 30,
      isActive: true,
      isCustom: false,
      sortOrder: 4,
      tenantCount: 12,
      features: DEFAULT_FEATURES.map((f) => ({ ...f, enabled: true })),
    },
  ];

  // Handle save
  const handleSave = async (data: PlanFormData, isNew: boolean) => {
    setIsSaving(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const url = isNew
        ? `${baseURL}/api/subscription-plans`
        : `${baseURL}/api/subscription-plans/${editingPlan?.id}`;

      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save plan');
      }

      setSuccessMessage(isNew ? 'Plan created successfully!' : 'Plan updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

      setIsModalOpen(false);
      setEditingPlan(null);
      fetchPlans();
    } catch (err) {
      console.error('Error saving plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${baseURL}/api/subscription-plans/${planId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete plan');
      }

      setSuccessMessage('Plan deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchPlans();
    } catch (err) {
      console.error('Error deleting plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete plan');
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (planId: string, isActive: boolean) => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${baseURL}/api/subscription-plans/${planId}/toggle-status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle plan status');
      }

      setSuccessMessage(`Plan ${isActive ? 'activated' : 'deactivated'} successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchPlans();
    } catch (err) {
      console.error('Error toggling status:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle status');
    }
  };

  // Handle duplicate
  const handleDuplicate = (plan: SubscriptionPlan) => {
    setEditingPlan({
      ...plan,
      id: '',
      code: `${plan.code}_COPY`,
      name: `${plan.name} (Copy)`,
      isCustom: true,
      tenantCount: 0,
    });
    setIsModalOpen(true);
  };

  // Handle edit
  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  // Handle create new
  const handleCreateNew = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full py-4">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/super-admin/subscriptions"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to Subscriptions
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <FiPackage className="w-8 h-8 text-blue-600" />
              Subscription Plans
            </h1>
            <p className="mt-2 text-gray-600">
              Manage subscription plans available during admin creation
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="w-5 h-5" />
            Add Plan
          </button>
        </div>
      </div>

      {/* Success Message */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3"
          >
            <FiCheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <FiAlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Total Plans</p>
          <p className="text-2xl font-bold text-gray-900">{plans.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Active Plans</p>
          <p className="text-2xl font-bold text-green-600">
            {plans.filter((p) => p.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Custom Plans</p>
          <p className="text-2xl font-bold text-purple-600">
            {plans.filter((p) => p.isCustom).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Total Tenants</p>
          <p className="text-2xl font-bold text-blue-600">
            {plans.reduce((sum, p) => sum + p.tenantCount, 0)}
          </p>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {plans
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              onDuplicate={handleDuplicate}
            />
          ))}
      </div>

      {/* Empty State */}
      {plans.length === 0 && (
        <div className="text-center py-12">
          <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No subscription plans</h3>
          <p className="text-gray-500 mb-6">Get started by creating your first plan</p>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FiPlus className="w-5 h-5" />
            Create Plan
          </button>
        </div>
      )}

      {/* Plan Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <PlanFormModal
            plan={editingPlan}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingPlan(null);
            }}
            onSave={handleSave}
            isLoading={isSaving}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
