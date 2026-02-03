'use client';

/**
 * Enterprise Admin Subscription Control - "God Mode" Page
 * 
 * This is the MASTER control panel for the entire ERP:
 * - Subscription plan management
 * - Feature availability and limits
 * - Approval thresholds
 * - Unlock pricing
 * - Infrastructure billing
 * - Enforcement logic
 * 
 * Only accessible by Enterprise Admin.
 * All logic is data-driven from this page.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  Settings,
  Users,
  DollarSign,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Save,
  Copy,
  Archive,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  HardDrive,
  FileText,
  Activity,
  Calculator,
  Clock,
  Zap,
  Star,
  Crown,
  Building2,
  CreditCard,
  TrendingUp,
  BarChart3,
  Database,
  Server,
  Cpu,
  Cloud,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SubscriptionPlan {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: 'active' | 'inactive' | 'archived';
  is_global: boolean;
  is_custom: boolean;
  badge_text: string | null;
  sort_order: number;
  is_popular: boolean;
  color_code: string;
  monthly_spend_cap: number | null;
  auto_block_on_cap: boolean;
  cfo_approval_threshold: number | null;
  invoice_cycle_days: number;
  grace_period_days: number;
  read_only_after_grace: boolean;
  active_tenant_count: number;
  created_at: string;
  updated_at: string;
}

interface FeatureDefinition {
  id: number;
  feature_code: string;
  feature_name: string;
  description: string | null;
  category: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

interface PlanFeatureControl {
  feature_code: string;
  feature_name: string;
  category: string;
  control_id: number | null;
  free_limit: number;
  limit_period: 'lifetime' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  unlock_price: number;
  unlock_unit: string;
  currency: string;
  approval_threshold: number | null;
  requires_approval: boolean;
  lock_mode: 'none' | 'soft' | 'hard';
  is_visible: boolean;
  show_in_pricing: boolean;
}

interface InfraRate {
  id: number;
  resource_type: string;
  resource_name: string;
  price_per_unit: number;
  unit_type: string;
  currency: string;
  billing_method: string;
  minimum_charge: number;
  is_active: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  projections: {
    maxUnlockRevenue: number;
    hardLockedCount: number;
    softLockedCount: number;
    unlimitedCount: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const CATEGORY_LABELS: Record<string, string> = {
  user_access: '👤 User & Access',
  task_workflow: '📋 Task & Workflow',
  finance: '💰 Finance & Payments',
  reporting: '📊 Reporting',
  banking: '🏦 Banking & Reconciliation',
  documents: '📁 Documents & Storage',
  system: '⚙️ System & API',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  user_access: <Users className="w-4 h-4" />,
  task_workflow: <FileText className="w-4 h-4" />,
  finance: <DollarSign className="w-4 h-4" />,
  reporting: <BarChart3 className="w-4 h-4" />,
  banking: <Building2 className="w-4 h-4" />,
  documents: <HardDrive className="w-4 h-4" />,
  system: <Cpu className="w-4 h-4" />,
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  FREE: <Star className="w-5 h-5 text-gray-500" />,
  BASIC: <Zap className="w-5 h-5 text-blue-500" />,
  STANDARD: <Shield className="w-5 h-5 text-purple-500" />,
  PREMIUM: <Crown className="w-5 h-5 text-amber-500" />,
  ENTERPRISE: <Building2 className="w-5 h-5 text-emerald-500" />,
};

const LIMIT_PERIOD_OPTIONS = [
  { value: 'lifetime', label: 'Lifetime' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SubscriptionControlPage() {
  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [allFeatures, setAllFeatures] = useState<FeatureDefinition[]>([]);
  const [infraRates, setInfraRates] = useState<InfraRate[]>([]);

  // Selection states
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [planFeatures, setPlanFeatures] = useState<PlanFeatureControl[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);

  // Edit states
  const [editingPlan, setEditingPlan] = useState<Partial<SubscriptionPlan> | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  // UI states
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'features' | 'governance' | 'infra'>('features');

  // Get selected plan
  const selectedPlan = useMemo(() => {
    if (!selectedPlanId) return null;
    return plans.find(p => p.id === selectedPlanId) || null;
  }, [plans, selectedPlanId]);

  // Group features by category
  const featuresByCategory = useMemo(() => {
    const grouped: Record<string, PlanFeatureControl[]> = {};
    planFeatures.forEach(f => {
      if (!grouped[f.category]) {
        grouped[f.category] = [];
      }
      grouped[f.category].push(f);
    });
    return grouped;
  }, [planFeatures]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadPlans = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/subscription-control/plans`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      } else {
        // Try to get error details from response
        let errorMsg = `Failed to load plans (${res.status})`;
        try {
          const errData = await res.json();
          errorMsg = errData.message || errData.error || errorMsg;
        } catch { /* ignore parse error */ }
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('[SubscriptionControl] Load plans error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription plans');
    }
  }, []);

  const loadFeatures = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/subscription-control/features`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAllFeatures(data.features || []);
      }
    } catch (err) {
      console.error('[SubscriptionControl] Load features error:', err);
    }
  }, []);

  const loadInfraRates = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/subscription-control/infra-rates`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setInfraRates(data.rates || []);
      }
    } catch (err) {
      console.error('[SubscriptionControl] Load infra rates error:', err);
    }
  }, []);

  const loadPlanFeatures = useCallback(async (planId: number) => {
    setFeaturesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/subscription-control/plans/${planId}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setPlanFeatures(data.features || []);
        setEditingPlan(data.plan);
        // Expand all categories by default
        const categories = new Set<string>(data.features.map((f: PlanFeatureControl) => f.category));
        setExpandedCategories(categories);
      }
    } catch (err) {
      console.error('[SubscriptionControl] Load plan features error:', err);
    } finally {
      setFeaturesLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadPlans(), loadFeatures(), loadInfraRates()]);
      setLoading(false);
    };
    loadAll();
  }, [loadPlans, loadFeatures, loadInfraRates]);

  // Load plan features when plan selected
  useEffect(() => {
    if (selectedPlanId) {
      loadPlanFeatures(selectedPlanId);
      setHasChanges(false);
    }
  }, [selectedPlanId, loadPlanFeatures]);

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validatePlan = useCallback(async () => {
    if (!editingPlan || planFeatures.length === 0) return;

    try {
      const res = await fetch(`${API_BASE}/api/subscription-control/validate-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          plan: editingPlan,
          features: planFeatures,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setValidation(data);
      }
    } catch (err) {
      console.error('[SubscriptionControl] Validation error:', err);
    }
  }, [editingPlan, planFeatures]);

  // Auto-validate when changes occur
  useEffect(() => {
    if (hasChanges) {
      const timer = setTimeout(validatePlan, 500);
      return () => clearTimeout(timer);
    }
  }, [hasChanges, validatePlan]);

  // ============================================================================
  // SAVE HANDLERS
  // ============================================================================

  const handleSavePlan = async () => {
    if (!selectedPlanId || !editingPlan) return;

    setSaving(true);
    try {
      // Save plan settings
      const planRes = await fetch(`${API_BASE}/api/subscription-control/plans/${selectedPlanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingPlan),
      });

      if (!planRes.ok) {
        const err = await planRes.json();
        throw new Error(err.error || 'Failed to save plan');
      }

      // Save feature controls
      const featuresRes = await fetch(`${API_BASE}/api/subscription-control/plans/${selectedPlanId}/features`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ features: planFeatures }),
      });

      if (!featuresRes.ok) {
        const err = await featuresRes.json();
        throw new Error(err.error || 'Failed to save features');
      }

      setHasChanges(false);
      await loadPlans();
      alert('Plan saved successfully!');
    } catch (err) {
      console.error('[SubscriptionControl] Save error:', err);
      alert(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleClonePlan = async (newCode: string, newName: string) => {
    if (!selectedPlanId) return;

    try {
      const res = await fetch(`${API_BASE}/api/subscription-control/plans/${selectedPlanId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ new_code: newCode, new_name: newName }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to clone plan');
      }

      await loadPlans();
      setShowCloneModal(false);
      alert(`Plan cloned as "${newName}"`);
    } catch (err) {
      console.error('[SubscriptionControl] Clone error:', err);
      alert(err instanceof Error ? err.message : 'Failed to clone plan');
    }
  };

  const handleArchivePlan = async () => {
    if (!selectedPlanId || !selectedPlan) return;

    if (!confirm(`Are you sure you want to archive "${selectedPlan.name}"? This will hide it from new assignments.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/subscription-control/plans/${selectedPlanId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'archived' }),
      });

      if (!res.ok) {
        throw new Error('Failed to archive plan');
      }

      await loadPlans();
      setSelectedPlanId(null);
    } catch (err) {
      console.error('[SubscriptionControl] Archive error:', err);
      alert('Failed to archive plan');
    }
  };

  const handleCreatePlan = async (planData: Partial<SubscriptionPlan>) => {
    try {
      const res = await fetch(`${API_BASE}/api/subscription-control/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(planData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create plan');
      }

      const data = await res.json();
      await loadPlans();
      setSelectedPlanId(data.plan.id);
      setShowCreateModal(false);
      alert(`Plan "${planData.name}" created successfully!`);
    } catch (err) {
      console.error('[SubscriptionControl] Create error:', err);
      alert(err instanceof Error ? err.message : 'Failed to create plan');
    }
  };

  // ============================================================================
  // FEATURE UPDATE HANDLERS
  // ============================================================================

  const updateFeature = (featureCode: string, updates: Partial<PlanFeatureControl>) => {
    setPlanFeatures(prev =>
      prev.map(f =>
        f.feature_code === featureCode ? { ...f, ...updates } : f
      )
    );
    setHasChanges(true);
  };

  const updatePlanSettings = (updates: Partial<SubscriptionPlan>) => {
    setEditingPlan(prev => prev ? { ...prev, ...updates } : updates);
    setHasChanges(true);
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const renderLockModeButton = (feature: PlanFeatureControl) => {
    const modes: Array<{ value: 'none' | 'soft' | 'hard'; label: string; icon: React.ReactNode; color: string }> = [
      { value: 'none', label: 'None', icon: <Unlock className="w-3 h-3" />, color: 'bg-green-100 text-green-700 border-green-300' },
      { value: 'soft', label: 'Soft', icon: <Lock className="w-3 h-3" />, color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
      { value: 'hard', label: 'Hard', icon: <Lock className="w-3 h-3" />, color: 'bg-red-100 text-red-700 border-red-300' },
    ];

    return (
      <div className="flex gap-1">
        {modes.map(mode => (
          <button
            key={mode.value}
            onClick={() => updateFeature(feature.feature_code, { lock_mode: mode.value })}
            className={`px-2 py-1 text-[10px] rounded border flex items-center gap-1 transition ${
              feature.lock_mode === mode.value
                ? mode.color
                : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
            }`}
            title={`${mode.label} Lock`}
          >
            {mode.icon}
            {mode.label}
          </button>
        ))}
      </div>
    );
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          <p className="text-gray-500">Loading Subscription Control...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Subscription Control
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Master control panel for all subscription plans, limits, and pricing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadPlans();
              loadFeatures();
              loadInfraRates();
            }}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" />
            Create Plan
          </button>
        </div>
      </div>

      {/* Split Pane Layout */}
      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* LEFT PANEL - Plan Selector */}
        <div className="w-72 flex-shrink-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Plans
              <span className="text-xs font-normal text-gray-500 ml-auto">{plans.length} total</span>
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {plans.map(plan => {
              const isSelected = selectedPlanId === plan.id;
              const PlanIcon = PLAN_ICONS[plan.code] || <Star className="w-5 h-5 text-gray-400" />;

              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 ring-2 ring-purple-300'
                      : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: plan.color_code + '20' }}
                    >
                      {PlanIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {plan.name}
                        </span>
                        {plan.is_popular && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                            Popular
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Users className="w-3 h-3" />
                        {plan.active_tenant_count} tenants
                        <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                          plan.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : plan.status === 'inactive'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {plan.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL - Plan Configuration */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          {!selectedPlanId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Settings className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Select a plan from the left panel to configure</p>
              </div>
            </div>
          ) : (
            <>
              {/* Plan Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: (selectedPlan?.color_code || '#3B82F6') + '20' }}
                    >
                      {PLAN_ICONS[selectedPlan?.code || ''] || <Star className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingPlan?.name || ''}
                          onChange={e => updatePlanSettings({ name: e.target.value })}
                          className="text-lg font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 focus:outline-none px-1"
                        />
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded font-mono">
                          {selectedPlan?.code}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={editingPlan?.description || ''}
                        onChange={e => updatePlanSettings({ description: e.target.value })}
                        placeholder="Plan description..."
                        className="text-sm text-gray-500 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 focus:outline-none w-full"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasChanges && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Unsaved changes
                      </span>
                    )}
                    <button
                      onClick={() => setShowCloneModal(true)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                      title="Clone Plan"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleArchivePlan}
                      className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg"
                      title="Archive Plan"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSavePlan}
                      disabled={saving || !hasChanges}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                        hasChanges && !saving
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Plan'}
                    </button>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 mt-4">
                  {[
                    { key: 'features', label: 'Feature Controls', icon: <Settings className="w-4 h-4" /> },
                    { key: 'governance', label: 'Governance Rules', icon: <Shield className="w-4 h-4" /> },
                    { key: 'infra', label: 'Infrastructure', icon: <Server className="w-4 h-4" /> },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                        activeTab === tab.key
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {featuresLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  </div>
                ) : activeTab === 'features' ? (
                  /* FEATURE CONTROLS TAB */
                  <div className="space-y-4">
                    {/* Validation Sidebar */}
                    {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
                      <div className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-200">
                        {validation.errors.map((err, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-red-700">
                            <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {err}
                          </div>
                        ))}
                        {validation.warnings.map((warn, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-amber-700">
                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {warn}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Feature Grid by Category */}
                    {Object.entries(featuresByCategory).map(([category, features]) => (
                      <div key={category} className="border rounded-lg overflow-hidden">
                        {/* Category Header */}
                        <button
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <div className="flex items-center gap-2 font-medium">
                            {CATEGORY_ICONS[category] || <Settings className="w-4 h-4" />}
                            {CATEGORY_LABELS[category] || category}
                            <span className="text-xs text-gray-500 font-normal">
                              ({features.length} features)
                            </span>
                          </div>
                          {expandedCategories.has(category) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>

                        {/* Features Table */}
                        {expandedCategories.has(category) && (
                          <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-2 p-2 bg-gray-100 dark:bg-gray-800 text-[10px] font-medium text-gray-500 uppercase">
                              <div className="col-span-3">Feature</div>
                              <div className="col-span-1 text-center">Free Limit</div>
                              <div className="col-span-1 text-center">Period</div>
                              <div className="col-span-1 text-center">Unlock ₹</div>
                              <div className="col-span-2 text-center">Approval Threshold</div>
                              <div className="col-span-2 text-center">Lock Mode</div>
                              <div className="col-span-2 text-center">Visibility</div>
                            </div>

                            {/* Feature Rows */}
                            {features.map(feature => (
                              <div
                                key={feature.feature_code}
                                className={`grid grid-cols-12 gap-2 p-2 items-center hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                  feature.lock_mode === 'hard' ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                                }`}
                              >
                                {/* Feature Name */}
                                <div className="col-span-3">
                                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                    {feature.feature_name}
                                  </div>
                                  <div className="text-[10px] text-gray-500 font-mono">
                                    {feature.feature_code}
                                  </div>
                                </div>

                                {/* Free Limit */}
                                <div className="col-span-1">
                                  <input
                                    type="number"
                                    value={feature.free_limit ?? ''}
                                    onChange={e => updateFeature(feature.feature_code, {
                                      free_limit: e.target.value === '' ? 0 : parseInt(e.target.value)
                                    })}
                                    className="w-full px-2 py-1 text-sm text-center border rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                    title="Free limit (-1 = unlimited)"
                                  />
                                </div>

                                {/* Limit Period */}
                                <div className="col-span-1">
                                  <select
                                    value={feature.limit_period}
                                    onChange={e => updateFeature(feature.feature_code, {
                                      limit_period: e.target.value as any
                                    })}
                                    className="w-full px-1 py-1 text-xs border rounded bg-white dark:bg-gray-700"
                                  >
                                    {LIMIT_PERIOD_OPTIONS.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Unlock Price */}
                                <div className="col-span-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-400">₹</span>
                                    <input
                                      type="number"
                                      value={feature.unlock_price ?? ''}
                                      onChange={e => updateFeature(feature.feature_code, {
                                        unlock_price: e.target.value === '' ? 0 : parseFloat(e.target.value)
                                      })}
                                      className="w-full px-1 py-1 text-sm text-center border rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                      disabled={feature.lock_mode === 'hard'}
                                    />
                                  </div>
                                </div>

                                {/* Approval Threshold */}
                                <div className="col-span-2">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-400">₹</span>
                                    <input
                                      type="number"
                                      value={feature.approval_threshold || ''}
                                      onChange={e => updateFeature(feature.feature_code, {
                                        approval_threshold: e.target.value ? parseFloat(e.target.value) : null
                                      })}
                                      placeholder="None"
                                      className="w-full px-1 py-1 text-sm border rounded bg-white dark:bg-gray-700"
                                    />
                                  </div>
                                </div>

                                {/* Lock Mode */}
                                <div className="col-span-2">
                                  {renderLockModeButton(feature)}
                                </div>

                                {/* Visibility Toggle */}
                                <div className="col-span-2 flex items-center gap-2 justify-center">
                                  <button
                                    onClick={() => updateFeature(feature.feature_code, {
                                      is_visible: !feature.is_visible
                                    })}
                                    className={`p-1.5 rounded ${
                                      feature.is_visible
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-400'
                                    }`}
                                    title={feature.is_visible ? 'Visible' : 'Hidden'}
                                  >
                                    {feature.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : activeTab === 'governance' ? (
                  /* GOVERNANCE RULES TAB */
                  <div className="space-y-6">
                    {/* Financial Governance */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        Financial Governance
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Monthly Spend Cap
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">₹</span>
                            <input
                              type="number"
                              value={editingPlan?.monthly_spend_cap || ''}
                              onChange={e => updatePlanSettings({
                                monthly_spend_cap: e.target.value ? parseFloat(e.target.value) : null
                              })}
                              placeholder="No limit"
                              className="flex-1 px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Maximum allowed spend per month. Leave empty for no limit.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            CFO Approval Threshold
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">₹</span>
                            <input
                              type="number"
                              value={editingPlan?.cfo_approval_threshold || ''}
                              onChange={e => updatePlanSettings({
                                cfo_approval_threshold: e.target.value ? parseFloat(e.target.value) : null
                              })}
                              placeholder="No threshold"
                              className="flex-1 px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Amounts above this require CFO approval.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Invoice Cycle (Days)
                          </label>
                          <input
                            type="number"
                            value={editingPlan?.invoice_cycle_days ?? ''}
                            onChange={e => updatePlanSettings({
                              invoice_cycle_days: e.target.value === '' ? 30 : parseInt(e.target.value)
                            })}
                            min="1"
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Grace Period (Days)
                          </label>
                          <input
                            type="number"
                            value={editingPlan?.grace_period_days ?? ''}
                            onChange={e => updatePlanSettings({
                              grace_period_days: e.target.value === '' ? 7 : parseInt(e.target.value)
                            })}
                            min="0"
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
                          />
                        </div>
                      </div>

                      {/* Toggles */}
                      <div className="flex gap-6 mt-4 pt-4 border-t">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingPlan?.auto_block_on_cap || false}
                            onChange={e => updatePlanSettings({ auto_block_on_cap: e.target.checked })}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                          <span className="text-sm">Auto-block when cap reached</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingPlan?.read_only_after_grace || false}
                            onChange={e => updatePlanSettings({ read_only_after_grace: e.target.checked })}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                          <span className="text-sm">Read-only after grace period</span>
                        </label>
                      </div>
                    </div>

                    {/* Display Settings */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                        <Eye className="w-5 h-5 text-blue-600" />
                        Display Settings
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Badge Text
                          </label>
                          <input
                            type="text"
                            value={editingPlan?.badge_text || ''}
                            onChange={e => updatePlanSettings({ badge_text: e.target.value || null })}
                            placeholder="e.g., Popular, Best Value"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Color Code
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={editingPlan?.color_code || '#3B82F6'}
                              onChange={e => updatePlanSettings({ color_code: e.target.value })}
                              className="w-10 h-10 rounded border cursor-pointer"
                            />
                            <input
                              type="text"
                              value={editingPlan?.color_code || '#3B82F6'}
                              onChange={e => updatePlanSettings({ color_code: e.target.value })}
                              className="flex-1 px-3 py-2 border rounded-lg font-mono text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Sort Order
                          </label>
                          <input
                            type="number"
                            value={editingPlan?.sort_order ?? ''}
                            onChange={e => updatePlanSettings({ sort_order: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                            min="0"
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
                          />
                        </div>
                      </div>
                      <div className="flex gap-6 mt-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingPlan?.is_popular || false}
                            onChange={e => updatePlanSettings({ is_popular: e.target.checked })}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                          <span className="text-sm">Mark as Popular</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* INFRASTRUCTURE TAB */
                  <div className="space-y-6">
                    <div className="border rounded-lg overflow-hidden">
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 border-b">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Server className="w-5 h-5 text-blue-600" />
                          Infrastructure Billing Rates
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          These rates apply to all plans. Usage is auto-metered and billed postpaid.
                        </p>
                      </div>
                      <div className="divide-y">
                        {infraRates.map(rate => (
                          <div key={rate.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              {rate.resource_type === 'db_storage' && <Database className="w-5 h-5 text-blue-500" />}
                              {rate.resource_type === 'file_storage' && <HardDrive className="w-5 h-5 text-green-500" />}
                              {rate.resource_type === 'api_calls' && <Activity className="w-5 h-5 text-purple-500" />}
                              {rate.resource_type === 'background_jobs' && <Cpu className="w-5 h-5 text-orange-500" />}
                              <div>
                                <div className="font-medium">{rate.resource_name}</div>
                                <div className="text-xs text-gray-500">{rate.resource_type}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="font-bold text-lg">₹{rate.price_per_unit}</div>
                                <div className="text-xs text-gray-500">per {rate.unit_type}</div>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs ${
                                rate.billing_method === 'metered'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {rate.billing_method}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Live Calculation Sidebar */}
                    {validation && (
                      <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                        <h3 className="font-semibold flex items-center gap-2 mb-4">
                          <Calculator className="w-5 h-5 text-purple-600" />
                          Live Calculations
                        </h3>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-green-600">
                              ₹{validation.projections.maxUnlockRevenue.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">Max Unlock Revenue</div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-red-600">
                              {validation.projections.hardLockedCount}
                            </div>
                            <div className="text-xs text-gray-500">Hard Locked</div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-yellow-600">
                              {validation.projections.softLockedCount}
                            </div>
                            <div className="text-xs text-gray-500">Soft Locked</div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {validation.projections.unlimitedCount}
                            </div>
                            <div className="text-xs text-gray-500">Unlimited</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Clone Plan Modal */}
      {showCloneModal && (
        <ClonePlanModal
          sourcePlan={selectedPlan}
          onClose={() => setShowCloneModal(false)}
          onClone={handleClonePlan}
        />
      )}

      {/* Create Plan Modal */}
      {showCreateModal && (
        <CreatePlanModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreatePlan}
        />
      )}
    </div>
  );
}

// ============================================================================
// MODAL COMPONENTS
// ============================================================================

function ClonePlanModal({
  sourcePlan,
  onClose,
  onClone,
}: {
  sourcePlan: SubscriptionPlan | null;
  onClose: () => void;
  onClone: (code: string, name: string) => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState(sourcePlan ? `${sourcePlan.name} (Copy)` : '');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Copy className="w-5 h-5" />
          Clone Plan
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Create a copy of "{sourcePlan?.name}" with all its feature controls.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">New Plan Code</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
              placeholder="e.g., CUSTOM_ENTERPRISE"
              className="w-full px-3 py-2 border rounded-lg font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              Uppercase letters, numbers, and underscores only. Cannot be changed later.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New Plan Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Custom Enterprise Plan"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => onClone(code, name)}
            disabled={!code || !name}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            Clone Plan
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatePlanModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: Partial<SubscriptionPlan>) => void;
}) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    color_code: '#3B82F6',
    monthly_spend_cap: '',
    cfo_approval_threshold: '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create New Plan
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Plan Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '')
                }))}
                placeholder="e.g., CUSTOM"
                className="w-full px-3 py-2 border rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Plan Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Custom Plan"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Plan description..."
              rows={2}
              className="w-full px-3 py-2 border rounded-lg resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.color_code}
                  onChange={e => setFormData(prev => ({ ...prev, color_code: e.target.value }))}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Spend Cap (₹)</label>
              <input
                type="number"
                value={formData.monthly_spend_cap}
                onChange={e => setFormData(prev => ({ ...prev, monthly_spend_cap: e.target.value }))}
                placeholder="Optional"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CFO Threshold (₹)</label>
              <input
                type="number"
                value={formData.cfo_approval_threshold}
                onChange={e => setFormData(prev => ({ ...prev, cfo_approval_threshold: e.target.value }))}
                placeholder="Optional"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => onCreate({
              ...formData,
              monthly_spend_cap: formData.monthly_spend_cap ? parseFloat(formData.monthly_spend_cap) : null,
              cfo_approval_threshold: formData.cfo_approval_threshold ? parseFloat(formData.cfo_approval_threshold) : null,
            } as any)}
            disabled={!formData.code || !formData.name}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            Create Plan
          </button>
        </div>
      </div>
    </div>
  );
}
