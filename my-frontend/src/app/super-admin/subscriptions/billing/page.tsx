'use client';

/**
 * SuperAdmin - Billing Overrides
 * 
 * Features:
 * - Apply custom pricing to tenants
 * - Override feature limits
 * - Grant/revoke features outside their plan
 * - View all active overrides
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  Search,
  Plus,
  Edit,
  Trash2,
  Building2,
  Calendar,
  Percent,
  Package,
  Users,
  HardDrive,
  Activity,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  Loader2,
  AlertTriangle,
  Check,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface BillingOverride {
  id: string;
  tenantId: string;
  tenantName: string;
  planName: string;
  overrideType: 'discount' | 'price' | 'feature' | 'limit';
  description: string;
  value: unknown;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

interface Tenant {
  id: string;
  name: string;
  plan: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const OVERRIDE_TYPES = [
  { value: 'discount', label: 'Discount %', icon: Percent },
  { value: 'price', label: 'Custom Price', icon: DollarSign },
  { value: 'feature', label: 'Feature Toggle', icon: Package },
  { value: 'limit', label: 'Limit Override', icon: Activity },
];

const FEATURES = [
  { id: 'CUSTOM_ROLES', name: 'Custom Roles' },
  { id: 'MAKER_CHECKER', name: 'Maker-Checker Workflow' },
  { id: 'AUTOMATION_RULES', name: 'Automation Rules' },
  { id: 'API_ACCESS', name: 'API Access' },
  { id: 'AUDIT_EXPORT', name: 'Audit Export' },
  { id: 'REALTIME_SOCKET', name: 'Real-time Sync' },
  { id: 'REPORT_BUILDER', name: 'Report Builder' },
  { id: 'COMPLIANCE_MODULE', name: 'Compliance Module' },
  { id: 'WHITE_LABEL', name: 'White Label' },
  { id: 'SSO', name: 'Single Sign-On' },
  { id: 'MULTI_ENTITY', name: 'Multi-Entity' },
];

const LIMITS = [
  { id: 'users', name: 'User Limit' },
  { id: 'storage', name: 'Storage (GB)' },
  { id: 'apiCalls', name: 'API Calls/month' },
  { id: 'integrations', name: 'Integrations' },
];

// ============================================================================
// COMPONENTS
// ============================================================================

// Override Card Component
function OverrideCard({
  override,
  onEdit,
  onDelete,
}: {
  override: BillingOverride;
  onEdit: (o: BillingOverride) => void;
  onDelete: (id: string) => void;
}) {
  const typeConfig = OVERRIDE_TYPES.find((t) => t.value === override.overrideType);
  const Icon = typeConfig?.icon || DollarSign;
  const isExpired = override.validUntil && new Date(override.validUntil) < new Date();

  const getDisplayValue = () => {
    switch (override.overrideType) {
      case 'discount':
        return `${override.value}% off`;
      case 'price':
        return `₹${(override.value as number).toLocaleString()}/month`;
      case 'feature':
        const feature = override.value as { featureId: string; enabled: boolean };
        return `${feature.featureId}: ${feature.enabled ? 'Enabled' : 'Disabled'}`;
      case 'limit':
        const limit = override.value as { limitId: string; value: number };
        return `${limit.limitId}: ${limit.value === -1 ? 'Unlimited' : limit.value}`;
      default:
        return JSON.stringify(override.value);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border ${
        isExpired
          ? 'border-gray-300 dark:border-slate-600 opacity-60'
          : override.isActive
          ? 'border-violet-200 dark:border-violet-800'
          : 'border-gray-200 dark:border-slate-700'
      } p-4`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`p-2 rounded-lg ${
            override.overrideType === 'discount'
              ? 'bg-emerald-100 text-emerald-600'
              : override.overrideType === 'price'
              ? 'bg-violet-100 text-violet-600'
              : override.overrideType === 'feature'
              ? 'bg-blue-100 text-blue-600'
              : 'bg-amber-100 text-amber-600'
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900 dark:text-white">{override.tenantName}</h3>
            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 rounded">
              {override.planName}
            </span>
            {isExpired && (
              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded">
                Expired
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{override.description}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium text-gray-900 dark:text-white">{getDisplayValue()}</span>
            <span className="text-gray-500">
              <Calendar className="w-4 h-4 inline mr-1" />
              {new Date(override.validFrom).toLocaleDateString()}
              {override.validUntil && ` - ${new Date(override.validUntil).toLocaleDateString()}`}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(override)}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(override.id)}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Create/Edit Override Modal
function OverrideModal({
  isOpen,
  onClose,
  onSave,
  override,
  tenants,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<BillingOverride>) => void;
  override: BillingOverride | null;
  tenants: Tenant[];
}) {
  const [formData, setFormData] = useState({
    tenantId: '',
    overrideType: 'discount' as 'discount' | 'price' | 'feature' | 'limit',
    description: '',
    discountValue: 10,
    priceValue: 0,
    featureId: FEATURES[0].id,
    featureEnabled: true,
    limitId: LIMITS[0].id,
    limitValue: 0,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (override) {
      setFormData({
        tenantId: override.tenantId,
        overrideType: override.overrideType,
        description: override.description,
        discountValue: override.overrideType === 'discount' ? (override.value as number) : 10,
        priceValue: override.overrideType === 'price' ? (override.value as number) : 0,
        featureId: override.overrideType === 'feature' ? (override.value as { featureId: string }).featureId : FEATURES[0].id,
        featureEnabled: override.overrideType === 'feature' ? (override.value as { enabled: boolean }).enabled : true,
        limitId: override.overrideType === 'limit' ? (override.value as { limitId: string }).limitId : LIMITS[0].id,
        limitValue: override.overrideType === 'limit' ? (override.value as { value: number }).value : 0,
        validFrom: override.validFrom.split('T')[0],
        validUntil: override.validUntil?.split('T')[0] || '',
        isActive: override.isActive,
      });
    } else {
      setFormData({
        tenantId: '',
        overrideType: 'discount',
        description: '',
        discountValue: 10,
        priceValue: 0,
        featureId: FEATURES[0].id,
        featureEnabled: true,
        limitId: LIMITS[0].id,
        limitValue: 0,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: '',
        isActive: true,
      });
    }
  }, [override, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let value: unknown;
      switch (formData.overrideType) {
        case 'discount':
          value = formData.discountValue;
          break;
        case 'price':
          value = formData.priceValue;
          break;
        case 'feature':
          value = { featureId: formData.featureId, enabled: formData.featureEnabled };
          break;
        case 'limit':
          value = { limitId: formData.limitId, value: formData.limitValue };
          break;
      }

      await onSave({
        id: override?.id,
        tenantId: formData.tenantId,
        overrideType: formData.overrideType,
        description: formData.description,
        value,
        validFrom: formData.validFrom,
        validUntil: formData.validUntil || null,
        isActive: formData.isActive,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {override ? 'Edit Override' : 'Create Billing Override'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Tenant Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tenant
            </label>
            <select
              value={formData.tenantId}
              onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
              disabled={!!override}
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white disabled:opacity-50"
            >
              <option value="">Select a tenant...</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.plan})
                </option>
              ))}
            </select>
          </div>

          {/* Override Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Override Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {OVERRIDE_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setFormData({ ...formData, overrideType: type.value as typeof formData.overrideType })}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                      formData.overrideType === type.value
                        ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700'
                        : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${formData.overrideType === type.value ? 'text-violet-600' : 'text-gray-500'}`} />
                    <span className={`text-sm font-medium ${formData.overrideType === type.value ? 'text-violet-700 dark:text-violet-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Value Input based on type */}
          {formData.overrideType === 'discount' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Discount Percentage
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 pr-8 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
          )}

          {formData.overrideType === 'price' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Custom Monthly Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formData.priceValue}
                onChange={(e) => setFormData({ ...formData, priceValue: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>
          )}

          {formData.overrideType === 'feature' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Feature
                </label>
                <select
                  value={formData.featureId}
                  onChange={(e) => setFormData({ ...formData, featureId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                >
                  {FEATURES.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormData({ ...formData, featureEnabled: true })}
                    className={`flex-1 py-2 px-4 rounded-lg border ${
                      formData.featureEnabled
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    <Check className="w-4 h-4 inline mr-2" />
                    Enable
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, featureEnabled: false })}
                    className={`flex-1 py-2 px-4 rounded-lg border ${
                      !formData.featureEnabled
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    <X className="w-4 h-4 inline mr-2" />
                    Disable
                  </button>
                </div>
              </div>
            </div>
          )}

          {formData.overrideType === 'limit' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Limit Type
                </label>
                <select
                  value={formData.limitId}
                  onChange={(e) => setFormData({ ...formData, limitId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                >
                  {LIMITS.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Value (-1 for unlimited)
                </label>
                <input
                  type="number"
                  min="-1"
                  value={formData.limitValue}
                  onChange={(e) => setFormData({ ...formData, limitValue: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description / Reason
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Reason for this override..."
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
            />
          </div>

          {/* Validity Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Valid From
              </label>
              <input
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Valid Until (optional)
              </label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Active Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded text-violet-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Override is active</span>
          </label>
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
            disabled={loading || !formData.tenantId}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            {override ? 'Update Override' : 'Create Override'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function BillingOverridesPage() {
  const [overrides, setOverrides] = useState<BillingOverride[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingOverride, setEditingOverride] = useState<BillingOverride | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overridesRes, tenantsRes] = await Promise.all([
        fetch('/api/super-admin/subscriptions/billing-overrides', { credentials: 'include' }),
        fetch('/api/super-admin/subscriptions/tenants?limit=1000', { credentials: 'include' }),
      ]);

      if (overridesRes.ok) {
        const data = await overridesRes.json();
        setOverrides(data.overrides || []);
      }

      if (tenantsRes.ok) {
        const data = await tenantsRes.json();
        setTenants((data.subscriptions || []).map((s: { tenantId: string; tenantName: string; plan: string }) => ({
          id: s.tenantId,
          name: s.tenantName,
          plan: s.plan,
        })));
      }
    } catch {
      console.error('Error fetching data');
      // Mock data
      setOverrides([
        {
          id: '1',
          tenantId: 'tenant-001',
          tenantName: 'Acme Corporation',
          planName: 'Business',
          overrideType: 'discount',
          description: 'Loyalty discount for long-term customer',
          value: 20,
          validFrom: new Date(Date.now() - 30 * 86400000).toISOString(),
          validUntil: new Date(Date.now() + 60 * 86400000).toISOString(),
          isActive: true,
          createdBy: 'John Admin',
          createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        },
        {
          id: '2',
          tenantId: 'tenant-002',
          tenantName: 'TechStart Inc',
          planName: 'Professional',
          overrideType: 'feature',
          description: 'Early access to API feature',
          value: { featureId: 'API_ACCESS', enabled: true },
          validFrom: new Date().toISOString(),
          validUntil: null,
          isActive: true,
          createdBy: 'Jane Manager',
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          tenantId: 'tenant-003',
          tenantName: 'Global Traders',
          planName: 'Starter',
          overrideType: 'limit',
          description: 'Temporary user limit increase',
          value: { limitId: 'users', value: 10 },
          validFrom: new Date(Date.now() - 7 * 86400000).toISOString(),
          validUntil: new Date(Date.now() + 23 * 86400000).toISOString(),
          isActive: true,
          createdBy: 'John Admin',
          createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        },
      ]);
      setTenants([
        { id: 'tenant-001', name: 'Acme Corporation', plan: 'BUSINESS' },
        { id: 'tenant-002', name: 'TechStart Inc', plan: 'PROFESSIONAL' },
        { id: 'tenant-003', name: 'Global Traders', plan: 'STARTER' },
        { id: 'tenant-004', name: 'Local Shop', plan: 'STARTER' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle save
  const handleSave = async (data: Partial<BillingOverride>) => {
    try {
      const endpoint = data.id
        ? `/api/super-admin/subscriptions/billing-overrides/${data.id}`
        : '/api/super-admin/subscriptions/billing-overrides';
      const method = data.id ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to save');

      fetchData();
    } catch (err) {
      console.error('Save error:', err);
      // For demo, just refresh
      fetchData();
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this override?')) return;

    try {
      const response = await fetch(`/api/super-admin/subscriptions/billing-overrides/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to delete');

      fetchData();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete override');
    }
  };

  // Filter overrides
  const filteredOverrides = overrides.filter((o) => {
    const matchesSearch =
      !searchQuery ||
      o.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !filterType || o.overrideType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing Overrides</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Apply custom pricing, features, and limits to individual tenants
          </p>
        </div>
        <button
          onClick={() => {
            setEditingOverride(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
        >
          <Plus className="w-5 h-5" />
          Create Override
        </button>
      </div>

      {/* Warning */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Overrides take precedence over plan defaults
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Any override set here will immediately apply to the tenant, regardless of their plan settings.
              All changes are audit-logged.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by tenant or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
        >
          <option value="">All Types</option>
          {OVERRIDE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      {/* Overrides List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      ) : filteredOverrides.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No billing overrides found</p>
          <button
            onClick={() => {
              setEditingOverride(null);
              setShowModal(true);
            }}
            className="mt-4 text-violet-600 hover:text-violet-700 font-medium"
          >
            Create your first override
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOverrides.map((override) => (
            <OverrideCard
              key={override.id}
              override={override}
              onEdit={(o) => {
                setEditingOverride(o);
                setShowModal(true);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <OverrideModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingOverride(null);
        }}
        onSave={handleSave}
        override={editingOverride}
        tenants={tenants}
      />
    </div>
  );
}
