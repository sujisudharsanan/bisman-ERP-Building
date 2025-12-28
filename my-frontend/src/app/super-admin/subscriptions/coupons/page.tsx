'use client';

/**
 * SuperAdmin Coupon Management Page
 * 
 * Create, manage, and track subscription activation coupons.
 * Coupons are the ONLY way to activate subscriptions (no payment gateway).
 * 
 * @page /super-admin/subscriptions/coupons
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Ban,
  Calendar,
  Users,
  Building,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Copy,
  Filter,
  ChevronDown,
  ChevronRight,
  X,
  Gift,
  Sparkles,
  FileText,
  Download,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Link from 'next/link';

// ============================================================================
// TYPES
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
  cfo_approval_threshold: number | null;
  active_tenant_count: number;
}

interface Coupon {
  id: number;
  code: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'REDEEMED';
  plan_id: number;
  plan_name: string;
  plan_tier: string;
  valid_from: string;
  valid_until: string;
  tenant_restriction_type: 'ANY' | 'ONLY_NEW_TENANTS' | 'SPECIFIC_TENANT';
  specific_tenant_id: number | null;
  specific_tenant_name: string | null;
  redeemed_at: string | null;
  redeemed_by_tenant_id: number | null;
  redeemed_by_tenant_name: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  created_at: string;
  created_by_name: string;
}

interface AuditLogEntry {
  id: number;
  event_type: string;
  coupon_id: number;
  coupon_code: string;
  actor_user_id: string;
  actor_name: string;
  actor_role: string;
  tenant_id: number | null;
  tenant_name: string | null;
  payload_snapshot: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG = {
  ACTIVE: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle },
  EXPIRED: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: Clock },
  REVOKED: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: XCircle },
  REDEEMED: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: Gift },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRemainingDays(validUntil: string): number {
  const now = new Date();
  const expiry = new Date(validUntil);
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================================================
// CREATE COUPON MODAL
// ============================================================================

interface CreateCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plans: SubscriptionPlan[];
}

function CreateCouponModal({ isOpen, onClose, onSuccess, plans }: CreateCouponModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [selectedPlanId, setSelectedPlanId] = useState<number | string | null>(null);
  const [validityDays, setValidityDays] = useState(30);
  const [tenantRestriction, setTenantRestriction] = useState<'ANY' | 'ONLY_NEW_TENANTS' | 'SPECIFIC_TENANT'>('ANY');
  const [specificTenantId, setSpecificTenantId] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlanId) {
      setError('Please select a plan');
      return;
    }

    setLoading(true);
    setError(null);

    // Calculate validity dates
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDays);

    try {
      const response = await fetch('/api/superadmin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planId: selectedPlanId,
          validFrom: validFrom.toISOString(),
          validUntil: validUntil.toISOString(),
          durationDays: validityDays,
          tenantRestrictionType: tenantRestriction,
          restrictedTenantId: tenantRestriction === 'SPECIFIC_TENANT' ? specificTenantId : null,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create coupon');
      }

      onSuccess();
      onClose();
      
      // Reset form
      setSelectedPlanId(null);
      setValidityDays(30);
      setTenantRestriction('ANY');
      setSpecificTenantId('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create coupon');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
              <Ticket className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Create Activation Coupon
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Section A: Plan Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              A. Select Subscription Plan *
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
              {plans.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p>No subscription plans available</p>
                  <p className="text-xs mt-1">Create plans first in Subscription Control</p>
                </div>
              ) : (
                plans.filter(p => p.status === 'active').map(plan => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedPlanId === plan.id
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{plan.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {plan.code} {plan.is_popular && <span className="text-amber-600">★ Popular</span>}
                        </p>
                      </div>
                      {selectedPlanId === plan.id && (
                        <CheckCircle className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Section B: Validity Period */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              B. Coupon Validity Period
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={365}
                value={validityDays}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValidityDays(parseInt(e.target.value) || 30)}
                className="w-24"
              />
              <span className="text-gray-600 dark:text-gray-400">days from today</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Coupon must be redeemed within this period. Subscription duration is based on the plan&apos;s billing cycle.
            </p>
          </div>

          {/* Section C: Tenant Restriction */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              C. Tenant Restriction
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tenantRestriction"
                  value="ANY"
                  checked={tenantRestriction === 'ANY'}
                  onChange={() => setTenantRestriction('ANY')}
                  className="text-amber-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Any tenant can redeem</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tenantRestriction"
                  value="ONLY_NEW_TENANTS"
                  checked={tenantRestriction === 'ONLY_NEW_TENANTS'}
                  onChange={() => setTenantRestriction('ONLY_NEW_TENANTS')}
                  className="text-amber-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">New tenants only (no prior subscription)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tenantRestriction"
                  value="SPECIFIC_TENANT"
                  checked={tenantRestriction === 'SPECIFIC_TENANT'}
                  onChange={() => setTenantRestriction('SPECIFIC_TENANT')}
                  className="text-amber-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Specific tenant only</span>
              </label>
            </div>
            {tenantRestriction === 'SPECIFIC_TENANT' && (
              <Input
                type="text"
                placeholder="Enter tenant ID"
                value={specificTenantId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpecificTenantId(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* Section D: Notes */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              D. Internal Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Created for ABC Corp onboarding"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Preview */}
          {selectedPlan && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview</h4>
              <div className="text-sm space-y-1">
                <p><span className="text-gray-500">Plan:</span> {selectedPlan.name}</p>
                <p><span className="text-gray-500">Coupon valid until:</span> {formatDate(new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString())}</p>
                <p><span className="text-gray-500">Restriction:</span> {tenantRestriction.replace(/_/g, ' ').toLowerCase()}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedPlanId}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Coupon
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ============================================================================
// COUPON DETAILS DRAWER
// ============================================================================

interface CouponDetailsDrawerProps {
  coupon: Coupon | null;
  isOpen: boolean;
  onClose: () => void;
  onRevoke: (couponId: number, reason: string) => Promise<void>;
}

function CouponDetailsDrawer({ coupon, isOpen, onClose, onRevoke }: CouponDetailsDrawerProps) {
  const [revoking, setRevoking] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [showRevokeForm, setShowRevokeForm] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !coupon) return null;

  const statusConfig = STATUS_CONFIG[coupon.status];
  const StatusIcon = statusConfig.icon;
  const remainingDays = getRemainingDays(coupon.valid_until);
  const isExpiringSoon = coupon.status === 'ACTIVE' && remainingDays <= 7 && remainingDays > 0;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async () => {
    if (!revokeReason.trim()) return;
    setRevoking(true);
    try {
      await onRevoke(coupon.id, revokeReason);
      setShowRevokeForm(false);
      setRevokeReason('');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="relative bg-white dark:bg-gray-800 w-full max-w-md shadow-xl overflow-y-auto"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Coupon Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Coupon Code */}
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Activation Code</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-2xl font-mono font-bold tracking-wider text-gray-900 dark:text-gray-100">
                {coupon.code}
              </p>
              <button
                onClick={handleCopyCode}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {copied ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Status</span>
            <Badge className={statusConfig.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {coupon.status}
            </Badge>
          </div>

          {/* Plan Info */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Plan</p>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-gray-100">{coupon.plan_name}</p>
              <p className="text-sm text-gray-500">{coupon.plan_tier}</p>
            </div>
          </div>

          {/* Validity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Valid From</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(coupon.valid_from)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Valid Until</p>
              <p className={`font-medium ${isExpiringSoon ? 'text-amber-600' : 'text-gray-900 dark:text-gray-100'}`}>
                {formatDate(coupon.valid_until)}
                {isExpiringSoon && <span className="text-xs ml-1">({remainingDays}d left)</span>}
              </p>
            </div>
          </div>

          {/* Tenant Restriction */}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Tenant Restriction</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {coupon.tenant_restriction_type === 'ANY' && 'Any tenant'}
              {coupon.tenant_restriction_type === 'ONLY_NEW_TENANTS' && 'New tenants only'}
              {coupon.tenant_restriction_type === 'SPECIFIC_TENANT' && `Specific: ${coupon.specific_tenant_name || coupon.specific_tenant_id}`}
            </p>
          </div>

          {/* Redemption Info */}
          {coupon.redeemed_at && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Redeemed</p>
              <div className="text-sm space-y-1">
                <p><span className="text-blue-600 dark:text-blue-400">Date:</span> {formatDateTime(coupon.redeemed_at)}</p>
                <p><span className="text-blue-600 dark:text-blue-400">Tenant:</span> {coupon.redeemed_by_tenant_name || coupon.redeemed_by_tenant_id}</p>
              </div>
            </div>
          )}

          {/* Revocation Info */}
          {coupon.revoked_at && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Revoked</p>
              <div className="text-sm space-y-1">
                <p><span className="text-red-600 dark:text-red-400">Date:</span> {formatDateTime(coupon.revoked_at)}</p>
                <p><span className="text-red-600 dark:text-red-400">Reason:</span> {coupon.revoked_reason}</p>
              </div>
            </div>
          )}

          {/* Revoke Action */}
          {coupon.status === 'ACTIVE' && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              {!showRevokeForm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowRevokeForm(true)}
                  className="w-full text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Revoke Coupon
                </Button>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    placeholder="Reason for revocation..."
                    rows={2}
                    className="w-full px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowRevokeForm(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleRevoke}
                      disabled={revoking || !revokeReason.trim()}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      {revoking ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirm Revoke'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Created By */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
            <p>Created by {coupon.created_by_name}</p>
            <p>{formatDateTime(coupon.created_at)}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function SuperAdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [activeTab, setActiveTab] = useState<'coupons' | 'audit'>('coupons');

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [couponsRes, plansRes, auditRes] = await Promise.all([
        fetch('/api/superadmin/coupons', { credentials: 'include' }),
        fetch('/api/subscription-control/plans', { credentials: 'include' }),
        fetch('/api/superadmin/coupons/audit-logs', { credentials: 'include' }),
      ]);

      if (couponsRes.ok) {
        const data = await couponsRes.json();
        setCoupons(data.coupons || []);
      }

      if (plansRes.ok) {
        const data = await plansRes.json();
        // The endpoint returns { ok: true, plans: [...] }
        setPlans(data.plans || data || []);
      }

      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load coupon data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle revoke
  const handleRevoke = async (couponId: number, reason: string) => {
    const response = await fetch(`/api/superadmin/coupons/${couponId}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason }),
    });

    if (response.ok) {
      await fetchData();
      setSelectedCoupon(null);
    }
  };

  // Filter coupons
  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch = coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          coupon.plan_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || coupon.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: coupons.length,
    active: coupons.filter(c => c.status === 'ACTIVE').length,
    redeemed: coupons.filter(c => c.status === 'REDEEMED').length,
    expired: coupons.filter(c => c.status === 'EXPIRED').length,
    revoked: coupons.filter(c => c.status === 'REVOKED').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/super-admin/subscriptions" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Ticket className="w-6 h-6 text-amber-500" />
                Coupon Management
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Create and manage subscription activation coupons
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateModal(true)} className="bg-amber-600 hover:bg-amber-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Coupon
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Coupons</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              <p className="text-sm text-gray-500">Active</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-blue-600">{stats.redeemed}</p>
              <p className="text-sm text-gray-500">Redeemed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-gray-500">{stats.expired}</p>
              <p className="text-sm text-gray-500">Expired</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-red-600">{stats.revoked}</p>
              <p className="text-sm text-gray-500">Revoked</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('coupons')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'coupons'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4" />
              Coupons
            </div>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Audit Log
            </div>
          </button>
        </div>

        {/* Coupons Tab */}
        {activeTab === 'coupons' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Coupons</CardTitle>
                <div className="flex gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                      placeholder="Search coupons..."
                      className="pl-9 w-64"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="REDEEMED">Redeemed</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="REVOKED">Revoked</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredCoupons.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No coupons found</p>
                  <p className="text-sm mt-1">Create your first coupon to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Code</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Plan</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Valid Until</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Restriction</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Created</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCoupons.map(coupon => {
                        const statusConfig = STATUS_CONFIG[coupon.status];
                        const StatusIcon = statusConfig.icon;
                        const remainingDays = getRemainingDays(coupon.valid_until);
                        const isExpiringSoon = coupon.status === 'ACTIVE' && remainingDays <= 7 && remainingDays > 0;
                        
                        return (
                          <tr key={coupon.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-3 px-4">
                              <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                                {coupon.code}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{coupon.plan_name}</p>
                                <p className="text-xs text-gray-500">{coupon.plan_tier}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={statusConfig.color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {coupon.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <span className={isExpiringSoon ? 'text-amber-600 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                                {formatDate(coupon.valid_until)}
                                {isExpiringSoon && (
                                  <span className="ml-1 text-xs">({remainingDays}d)</span>
                                )}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                              {coupon.tenant_restriction_type === 'ANY' && 'Any'}
                              {coupon.tenant_restriction_type === 'ONLY_NEW_TENANTS' && 'New only'}
                              {coupon.tenant_restriction_type === 'SPECIFIC_TENANT' && 'Specific'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-500">
                              {formatDate(coupon.created_at)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedCoupon(coupon)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Audit Tab */}
        {activeTab === 'audit' && (
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>Complete history of coupon operations</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No audit logs yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className={`p-2 rounded-lg ${
                        log.event_type.includes('CREATED') ? 'bg-green-100 dark:bg-green-900/30' :
                        log.event_type.includes('REVOKED') ? 'bg-red-100 dark:bg-red-900/30' :
                        log.event_type.includes('REDEEMED') ? 'bg-blue-100 dark:bg-blue-900/30' :
                        'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        {log.event_type.includes('CREATED') && <Plus className="w-4 h-4 text-green-600" />}
                        {log.event_type.includes('REVOKED') && <Ban className="w-4 h-4 text-red-600" />}
                        {log.event_type.includes('REDEEMED') && <Gift className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {log.event_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Coupon: <span className="font-mono">{log.coupon_code}</span>
                          {log.tenant_name && <> • Tenant: {log.tenant_name}</>}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          By {log.actor_name} ({log.actor_role}) • {formatDateTime(log.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateCouponModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={fetchData}
            plans={plans}
          />
        )}
      </AnimatePresence>

      {/* Details Drawer */}
      <AnimatePresence>
        {selectedCoupon && (
          <CouponDetailsDrawer
            coupon={selectedCoupon}
            isOpen={!!selectedCoupon}
            onClose={() => setSelectedCoupon(null)}
            onRevoke={handleRevoke}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
