'use client';

/**
 * BISMAN ERP - SuperAdmin Micro-Unlock Subscription Management
 * 
 * Full control panel for managing:
 * - Feature catalog with pricing
 * - Subscription plans
 * - Tenant overrides
 * - Revenue analytics
 * - Audit logs
 * 
 * @page /super-admin/subscriptions/micro-unlock
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  DollarSign,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Users,
  Building,
  Activity,
  FileText,
  Settings,
  RefreshCw,
  Download,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Zap,
  Shield,
  CreditCard,
  BarChart3,
  Layers,
  Lock,
  Unlock,
  History,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';

// ============================================================================
// TYPES
// ============================================================================

interface Feature {
  id: number;
  feature_key: string;
  feature_name: string;
  description: string;
  category: string;
  default_limit: number;
  limit_period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  base_price: number;
  currency: string;
  is_editable: boolean;
  is_active: boolean;
  icon: string;
  sort_order: number;
}

interface SubscriptionPlan {
  id: number;
  plan_code: string;
  plan_name: string;
  description: string;
  base_price_monthly: number;
  base_price_yearly: number;
  included_features: string[];
  feature_price_overrides: Record<string, number>;
  is_public: boolean;
  sort_order: number;
  badge_text: string | null;
  is_popular: boolean;
  is_active: boolean;
}

interface AuditEntry {
  id: number;
  tenant_id: string;
  action: string;
  action_category: string;
  target_type: string;
  target_id: string;
  target_name: string;
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  reason: string;
  actor_type: string;
  actor_email: string;
  created_at: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'payments', label: 'Payments' },
  { value: 'reports', label: 'Reports' },
  { value: 'reconciliation', label: 'Reconciliation' },
  { value: 'audit', label: 'Audit & Compliance' },
  { value: 'communication', label: 'Communication' },
  { value: 'integrations', label: 'Integrations' },
  { value: 'advanced', label: 'Advanced' },
];

const PERIOD_LABELS: Record<string, string> = {
  DAILY: '/day',
  WEEKLY: '/week',
  MONTHLY: '/month',
  YEARLY: '/year',
  LIFETIME: 'once',
};

const CATEGORY_COLORS: Record<string, string> = {
  tasks: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  payments: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  reports: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  reconciliation: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  audit: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  communication: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  integrations: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  advanced: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

// ============================================================================
// API HELPERS
// ============================================================================

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/micro-unlock${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'API Error');
  return data;
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Feature Catalog Table
function FeatureCatalogTable({ 
  features, 
  onEdit, 
  onToggle 
}: { 
  features: Feature[];
  onEdit: (feature: Feature) => void;
  onToggle: (feature: Feature) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredFeatures = features.filter(f => {
    const matchesSearch = f.feature_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.feature_key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-500" />
          Feature Catalog
        </CardTitle>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search features..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Feature</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Category</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Free Limit</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Unlock Price</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Status</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeatures.map((feature) => (
                <tr 
                  key={feature.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {feature.feature_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {feature.feature_key}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={CATEGORY_COLORS[feature.category] || 'bg-gray-100'}>
                      {feature.category}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-medium">
                      {feature.default_limit === 0 ? (
                        <span className="text-red-500">Disabled</span>
                      ) : feature.default_limit === -1 ? (
                        <span className="text-green-500">Unlimited</span>
                      ) : (
                        <>
                          {feature.default_limit}
                          <span className="text-gray-500 text-xs ml-1">
                            {PERIOD_LABELS[feature.limit_period]}
                          </span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-bold text-green-600 dark:text-green-400">
                      ₹{feature.base_price}
                    </span>
                    <span className="text-gray-500 text-xs">/month</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Switch
                      checked={feature.is_active}
                      onCheckedChange={() => onToggle(feature)}
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(feature)}
                      disabled={!feature.is_editable}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Edit Feature Modal
function EditFeatureModal({
  feature,
  isOpen,
  onClose,
  onSave,
}: {
  feature: Feature | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (feature: Feature, updates: Partial<Feature>) => void;
}) {
  const [price, setPrice] = useState(0);
  const [limit, setLimit] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (feature) {
      setPrice(feature.base_price);
      setLimit(feature.default_limit);
    }
  }, [feature]);

  if (!isOpen || !feature) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(feature, { base_price: price, default_limit: limit });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Edit Feature Pricing
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{feature.feature_name}</p>
            <p className="text-sm text-gray-500">{feature.description}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Unlock Price (₹/month)
            </label>
            <Input
              type="number"
              value={price}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(parseFloat(e.target.value) || 0)}
              min={0}
              step={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Free Limit ({PERIOD_LABELS[feature.limit_period]})
            </label>
            <Input
              type="number"
              value={limit}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLimit(parseInt(e.target.value) || 0)}
              min={-1}
            />
            <p className="text-xs text-gray-500 mt-1">
              Use 0 for disabled, -1 for unlimited
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// Subscription Plans Manager
function SubscriptionPlansManager({
  plans,
  features,
  onSave,
  onDelete,
}: {
  plans: SubscriptionPlan[];
  features: Feature[];
  onSave: (plan: Partial<SubscriptionPlan>) => void;
  onDelete: (planCode: string) => void;
}) {
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    plan_code: '',
    plan_name: '',
    description: '',
    base_price_monthly: 0,
    base_price_yearly: 0,
    included_features: [] as string[],
    feature_price_overrides: {} as Record<string, number>,
    is_public: true,
    is_popular: false,
    badge_text: '',
    sort_order: 0,
  });

  useEffect(() => {
    if (editingPlan) {
      setFormData({
        plan_code: editingPlan.plan_code,
        plan_name: editingPlan.plan_name,
        description: editingPlan.description || '',
        base_price_monthly: editingPlan.base_price_monthly,
        base_price_yearly: editingPlan.base_price_yearly,
        included_features: editingPlan.included_features || [],
        feature_price_overrides: editingPlan.feature_price_overrides || {},
        is_public: editingPlan.is_public,
        is_popular: editingPlan.is_popular,
        badge_text: editingPlan.badge_text || '',
        sort_order: editingPlan.sort_order,
      });
    } else if (isCreating) {
      setFormData({
        plan_code: '',
        plan_name: '',
        description: '',
        base_price_monthly: 0,
        base_price_yearly: 0,
        included_features: [],
        feature_price_overrides: {},
        is_public: true,
        is_popular: false,
        badge_text: '',
        sort_order: plans.length + 1,
      });
    }
  }, [editingPlan, isCreating, plans.length]);

  const handleSave = () => {
    onSave(formData);
    setEditingPlan(null);
    setIsCreating(false);
  };

  const toggleIncludedFeature = (featureKey: string) => {
    setFormData(prev => ({
      ...prev,
      included_features: prev.included_features.includes(featureKey)
        ? prev.included_features.filter(f => f !== featureKey)
        : [...prev.included_features, featureKey],
    }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-500" />
          Subscription Plans
        </CardTitle>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Plan
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`border rounded-xl p-4 ${
                plan.is_popular 
                  ? 'border-purple-500 ring-2 ring-purple-100 dark:ring-purple-900' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    {plan.plan_name}
                  </h4>
                  {plan.badge_text && (
                    <Badge className="mt-1 text-xs">{plan.badge_text}</Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingPlan(plan)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <Edit className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
              
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ₹{plan.base_price_monthly}
                <span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              
              <p className="text-sm text-gray-500 mt-2 mb-4">
                {plan.description}
              </p>

              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Included Features:
                </p>
                {plan.included_features.length === 0 ? (
                  <p className="text-xs text-gray-400">No features included</p>
                ) : plan.included_features.includes('ALL') ? (
                  <p className="text-xs text-green-600">All features included</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {plan.included_features.slice(0, 3).map(f => (
                      <Badge key={f} variant="outline" className="text-xs">
                        {f.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                    {plan.included_features.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{plan.included_features.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <span className={`text-xs ${plan.is_public ? 'text-green-600' : 'text-gray-400'}`}>
                  {plan.is_public ? '✓ Public' : '○ Hidden'}
                </span>
                <span className="text-xs text-gray-400">
                  Order: {plan.sort_order}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Edit/Create Plan Modal */}
      <AnimatePresence>
        {(editingPlan || isCreating) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">
                    {isCreating ? 'Create New Plan' : 'Edit Plan'}
                  </h3>
                  <button
                    onClick={() => { setEditingPlan(null); setIsCreating(false); }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Plan Code</label>
                    <Input
                      value={formData.plan_code}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, plan_code: e.target.value.toUpperCase() }))}
                      placeholder="e.g., PROFESSIONAL"
                      disabled={!!editingPlan}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Plan Name</label>
                    <Input
                      value={formData.plan_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, plan_name: e.target.value }))}
                      placeholder="e.g., Professional"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <Input
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief plan description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Monthly Price (₹)</label>
                    <Input
                      type="number"
                      value={formData.base_price_monthly}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, base_price_monthly: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Yearly Price (₹)</label>
                    <Input
                      type="number"
                      value={formData.base_price_yearly}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, base_price_yearly: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Included Features (Free with plan)</label>
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {features.map(feature => (
                        <label
                          key={feature.feature_key}
                          className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={formData.included_features.includes(feature.feature_key)}
                            onChange={() => toggleIncludedFeature(feature.feature_key)}
                            className="rounded"
                          />
                          <span>{feature.feature_name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Badge Text</label>
                    <Input
                      value={formData.badge_text}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, badge_text: e.target.value }))}
                      placeholder="e.g., Most Popular"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Sort Order</label>
                    <Input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="flex items-center gap-4 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_public}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm">Public</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_popular}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, is_popular: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm">Popular</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => { setEditingPlan(null); setIsCreating(false); }}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Plan
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// Audit Log Section
function AuditLogSection({ logs }: { logs: AuditEntry[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const getActionIcon = (action: string) => {
    if (action.includes('unlock')) return <Unlock className="w-4 h-4 text-green-500" />;
    if (action.includes('disable')) return <Lock className="w-4 h-4 text-red-500" />;
    if (action.includes('price')) return <DollarSign className="w-4 h-4 text-blue-500" />;
    if (action.includes('plan')) return <Layers className="w-4 h-4 text-purple-500" />;
    return <Activity className="w-4 h-4 text-gray-500" />;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-orange-500" />
          Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.id}
              className="border border-gray-100 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
              >
                <div className="flex items-center gap-3">
                  {getActionIcon(log.action)}
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {log.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </p>
                    <p className="text-xs text-gray-500">
                      {log.target_name || log.target_id} • {log.actor_email || log.actor_type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expanded === log.id ? 'rotate-90' : ''}`} />
                </div>
              </div>
              
              <AnimatePresence>
                {expanded === log.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700"
                  >
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {log.old_values && Object.keys(log.old_values).length > 0 && (
                        <div>
                          <p className="font-medium text-gray-600 dark:text-gray-400 mb-1">Before:</p>
                          <pre className="bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.old_values, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.new_values && Object.keys(log.new_values).length > 0 && (
                        <div>
                          <p className="font-medium text-gray-600 dark:text-gray-400 mb-1">After:</p>
                          <pre className="bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.new_values, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                    {log.reason && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        <strong>Reason:</strong> {log.reason}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function SuperAdminMicroUnlockPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'plans' | 'audit'>('catalog');

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catalogData, plansData, auditData] = await Promise.all([
        fetchApi<{ features: Feature[] }>('/admin/catalog'),
        fetchApi<{ plans: SubscriptionPlan[] }>('/admin/plans'),
        fetchApi<{ logs: AuditEntry[] }>('/admin/audit?limit=50'),
      ]);
      
      setFeatures(catalogData.features || []);
      setPlans(plansData.plans || []);
      setAuditLogs(auditData.logs || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleEditFeature = (feature: Feature) => {
    setEditingFeature(feature);
  };

  const handleToggleFeature = async (feature: Feature) => {
    try {
      await fetchApi(`/admin/feature/${feature.feature_key}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !feature.is_active }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to toggle feature:', error);
    }
  };

  const handleSaveFeature = async (feature: Feature, updates: Partial<Feature>) => {
    try {
      await fetchApi(`/admin/feature/${feature.feature_key}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to save feature:', error);
      throw error;
    }
  };

  const handleSavePlan = async (plan: Partial<SubscriptionPlan>) => {
    try {
      await fetchApi('/admin/plans', {
        method: 'POST',
        body: JSON.stringify(plan),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to save plan:', error);
    }
  };

  const handleDeletePlan = async (planCode: string) => {
    // TODO: Implement delete
    console.log('Delete plan:', planCode);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Micro-Unlock Subscription Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Configure feature pricing, subscription plans, and tenant overrides
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{features.length}</p>
                <p className="text-sm text-gray-500">Features</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{plans.length}</p>
                <p className="text-sm text-gray-500">Plans</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">₹100</p>
                <p className="text-sm text-gray-500">Default Price</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{auditLogs.length}</p>
                <p className="text-sm text-gray-500">Recent Actions</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'catalog', label: 'Feature Catalog', icon: Package },
            { id: 'plans', label: 'Subscription Plans', icon: Layers },
            { id: 'audit', label: 'Audit Log', icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'catalog' && (
              <FeatureCatalogTable
                features={features}
                onEdit={handleEditFeature}
                onToggle={handleToggleFeature}
              />
            )}
            {activeTab === 'plans' && (
              <SubscriptionPlansManager
                plans={plans}
                features={features}
                onSave={handleSavePlan}
                onDelete={handleDeletePlan}
              />
            )}
            {activeTab === 'audit' && (
              <AuditLogSection logs={auditLogs} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Edit Feature Modal */}
        <EditFeatureModal
          feature={editingFeature}
          isOpen={!!editingFeature}
          onClose={() => setEditingFeature(null)}
          onSave={handleSaveFeature}
        />
      </div>
    </div>
  );
}
