'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import { 
  Plus, 
  Ticket, 
  Package, 
  Layers, 
  ClipboardList,
  Search,
  RefreshCw,
  Eye,
  Ban,
  Calendar,
  Users,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Copy,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';

// ============================================================================
// Types
// ============================================================================

interface Plan {
  id: number;
  plan_code: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_users: number;
  max_storage_gb: number;
  max_branches: number;
  feature_flags: Record<string, unknown>;
}

interface Coupon {
  id: string;
  code: string;
  plan_id: number;
  plan: { id: number; plan_code: string; name: string };
  plan_snapshot_json: Record<string, unknown>;
  duration_days: number;
  valid_from: string;
  valid_until: string;
  max_activations: number;
  used_count: number;
  tenant_restriction_type: string;
  status: string;
  derived_status: string;
  notes: string | null;
  sales_reference: string | null;
  created_at: string;
  creator: { id: string; first_name: string; last_name: string; email: string };
  tenant: { id: string; name: string; client_code: string } | null;
  activated_on: string | null;
  remaining_time: { expired: boolean; label: string } | null;
  usage: string;
  redemptions: Array<{
    tenant: { id: string; name: string; client_code: string };
    activated_at: string;
    subscription: { id: number; state: string; expires_at: string; started_at: string } | null;
  }>;
}

interface AuditLog {
  id: string;
  event_type: string;
  coupon: { code: string } | null;
  tenant: { name: string } | null;
  actor: { first_name: string; last_name: string; email: string } | null;
  payload_snapshot: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'CREATED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'REDEEMED': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'EXPIRED': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    case 'REVOKED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'EXHAUSTED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'CREATED': return 'Not Activated';
    case 'ACTIVE': return 'Active';
    case 'REDEEMED': return 'Activated';
    case 'EXPIRED': return 'Expired';
    case 'REVOKED': return 'Revoked';
    case 'EXHAUSTED': return 'Limit Reached';
    default: return status;
  }
}

function getEventTypeLabel(eventType: string): string {
  switch (eventType) {
    case 'COUPON_CREATED': return 'Coupon Created';
    case 'COUPON_REVOKED': return 'Coupon Revoked';
    case 'COUPON_REDEEMED': return 'Coupon Redeemed';
    case 'SUBSCRIPTION_ACTIVATED': return 'Subscription Activated';
    case 'SUBSCRIPTION_EXPIRED': return 'Subscription Expired';
    default: return eventType;
  }
}

// ============================================================================
// Create Coupon Modal Component
// ============================================================================

interface CreateCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plans: Plan[];
}

function CreateCouponModal({ isOpen, onClose, onSuccess, plans }: CreateCouponModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    planId: '',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    maxActivations: 1,
    durationDays: 30,
    tenantRestrictionType: 'ANY',
    restrictedTenantId: '',
    notes: '',
    salesReference: '',
  });
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const handlePlanChange = (planId: string) => {
    setFormData({ ...formData, planId });
    const plan = plans.find(p => p.id === parseInt(planId));
    setSelectedPlan(plan || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/superadmin/coupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planId: parseInt(formData.planId),
          validFrom: formData.validFrom,
          validUntil: formData.validUntil,
          maxActivations: formData.maxActivations,
          durationDays: formData.durationDays,
          tenantRestrictionType: formData.tenantRestrictionType,
          restrictedTenantId: formData.restrictedTenantId || null,
          notes: formData.notes || null,
          salesReference: formData.salesReference || null,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: 'Coupon Created',
          description: `Coupon ${data.coupon.code} created successfully`,
        });
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          planId: '',
          validFrom: new Date().toISOString().split('T')[0],
          validUntil: '',
          maxActivations: 1,
          durationDays: 30,
          tenantRestrictionType: 'ANY',
          restrictedTenantId: '',
          notes: '',
          salesReference: '',
        });
        setSelectedPlan(null);
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to create coupon',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Create coupon error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create coupon',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Plus className="w-5 h-5" /> Generate New Coupon
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create an activation code for subscription enrollment
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Section A: Plan Binding */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Package className="w-4 h-4" /> Plan Binding (Mandatory)
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Plan *
              </label>
              <select
                value={formData.planId}
                onChange={(e) => handlePlanChange(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a plan...</option>
                {plans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - ₹{plan.price_monthly}/mo
                  </option>
                ))}
              </select>
            </div>

            {selectedPlan && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm">
                <div className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                  Plan Snapshot Preview
                </div>
                <div className="grid grid-cols-2 gap-2 text-blue-700 dark:text-blue-400">
                  <div>Max Users: {selectedPlan.max_users === -1 ? 'Unlimited' : selectedPlan.max_users}</div>
                  <div>Storage: {selectedPlan.max_storage_gb === -1 ? 'Unlimited' : `${selectedPlan.max_storage_gb} GB`}</div>
                  <div>Branches: {selectedPlan.max_branches === -1 ? 'Unlimited' : selectedPlan.max_branches}</div>
                  <div>Price: ₹{selectedPlan.price_monthly}/mo</div>
                </div>
              </div>
            )}
          </div>

          {/* Section B: Validity Rules */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Validity Rules
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Valid From
                </label>
                <Input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  className="dark:bg-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Valid Until *
                </label>
                <Input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  required
                  className="dark:bg-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Activations
                </label>
                <Input
                  type="number"
                  min={1}
                  value={formData.maxActivations}
                  onChange={(e) => setFormData({ ...formData, maxActivations: parseInt(e.target.value) || 1 })}
                  className="dark:bg-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration (Days)
                </label>
                <select
                  value={formData.durationDays}
                  onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value={30}>30 Days (1 Month)</option>
                  <option value={90}>90 Days (3 Months)</option>
                  <option value={180}>180 Days (6 Months)</option>
                  <option value={365}>365 Days (1 Year)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section C: Usage Constraints */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Users className="w-4 h-4" /> Usage Constraints
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tenant Eligibility
              </label>
              <select
                value={formData.tenantRestrictionType}
                onChange={(e) => setFormData({ ...formData, tenantRestrictionType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="ANY">Any Organization</option>
                <option value="ONLY_NEW_TENANTS">Only New Organizations</option>
                <option value="SPECIFIC_TENANT">Specific Organization</option>
              </select>
            </div>

            {formData.tenantRestrictionType === 'SPECIFIC_TENANT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Organization ID
                </label>
                <Input
                  type="text"
                  value={formData.restrictedTenantId}
                  onChange={(e) => setFormData({ ...formData, restrictedTenantId: e.target.value })}
                  placeholder="Enter tenant UUID..."
                  className="dark:bg-slate-700"
                />
              </div>
            )}
          </div>

          {/* Section D: Internal Notes */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Internal Notes
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reason / Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter reason for creating this coupon..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sales / Onboarding Reference
              </label>
              <Input
                type="text"
                value={formData.salesReference}
                onChange={(e) => setFormData({ ...formData, salesReference: e.target.value })}
                placeholder="e.g., SALES-2025-001 or onboarding lead name"
                className="dark:bg-slate-700"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.planId || !formData.validUntil}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Coupon
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Coupon Detail Drawer Component
// ============================================================================

interface CouponDetailDrawerProps {
  coupon: Coupon | null;
  isOpen: boolean;
  onClose: () => void;
}

function CouponDetailDrawer({ coupon, isOpen, onClose }: CouponDetailDrawerProps) {
  if (!isOpen || !coupon) return null;

  const redemption = coupon.redemptions?.[0];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg h-full overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Coupon Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XCircle className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Section A: Coupon Metadata */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Coupon Metadata</h3>
            
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Code</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                    {coupon.code}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(coupon.code)}
                    className="p-1 h-auto"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Plan</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {coupon.plan.name}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Created By</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {coupon.creator.first_name} {coupon.creator.last_name}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Created At</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {formatDateTime(coupon.created_at)}
                </span>
              </div>
              
              {coupon.notes && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Notes</span>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{coupon.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section B: Activation Status */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Activation Status</h3>
            
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                <Badge className={getStatusBadgeColor(coupon.derived_status)}>
                  {getStatusLabel(coupon.derived_status)}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Tenant</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {redemption?.tenant?.name || '—'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Activated On</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {redemption?.activated_at ? formatDateTime(redemption.activated_at) : '—'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Usage</span>
                <span className="text-sm text-gray-900 dark:text-white">{coupon.usage}</span>
              </div>
            </div>
          </div>

          {/* Section C: Subscription Runtime */}
          {redemption?.subscription && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Subscription Runtime</h3>
              
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Start Date</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {formatDate(redemption.subscription.started_at)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">End Date</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {formatDate(redemption.subscription.expires_at)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Remaining Time</span>
                  <span className={`text-sm font-medium ${
                    coupon.remaining_time?.expired 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {coupon.remaining_time?.label || '—'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Validity Window */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Validity Window</h3>
            
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Valid From</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {formatDate(coupon.valid_from)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Valid Until</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {formatDate(coupon.valid_until)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Duration</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {coupon.duration_days} days
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SubscriptionsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('coupons');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data states
  const [plans, setPlans] = useState<Plan[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  // Fetch plans
  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/superadmin/coupons/plans/available`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  // Fetch coupons
  const fetchCoupons = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/superadmin/coupons`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setCoupons(data.coupons);
      }
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
    }
  };

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/superadmin/coupons/audit/log`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setAuditLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchPlans(), fetchCoupons(), fetchAuditLogs()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Handle revoke
  const handleRevoke = async (couponId: string) => {
    const reason = window.prompt('Enter revocation reason (required):');
    if (!reason || reason.trim().length < 5) {
      toast({
        title: 'Error',
        description: 'A revocation reason is required (minimum 5 characters)',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/superadmin/coupons/${couponId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      
      if (data.ok) {
        toast({
          title: 'Coupon Revoked',
          description: 'The coupon has been revoked successfully',
        });
        fetchCoupons();
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to revoke coupon',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Revoke error:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke coupon',
        variant: 'destructive',
      });
    }
  };

  // Filter coupons
  const filteredCoupons = coupons.filter(coupon => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      coupon.code.toLowerCase().includes(query) ||
      coupon.plan.name.toLowerCase().includes(query) ||
      coupon.tenant?.name?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage subscription plans, features, and activation codes</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Generate Coupon
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Package className="w-4 h-4" /> Plans
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Layers className="w-4 h-4" /> Features
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex items-center gap-2">
            <Ticket className="w-4 h-4" /> Coupons
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Audit
          </TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plans</CardTitle>
              <CardDescription>Available subscription plans for coupon creation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map(plan => (
                  <div 
                    key={plan.id}
                    className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                      <Badge variant="outline">{plan.plan_code}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      ₹{plan.price_monthly}/mo
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <div>Users: {plan.max_users === -1 ? 'Unlimited' : plan.max_users}</div>
                      <div>Storage: {plan.max_storage_gb === -1 ? 'Unlimited' : `${plan.max_storage_gb} GB`}</div>
                      <div>Branches: {plan.max_branches === -1 ? 'Unlimited' : plan.max_branches}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>Plan feature configuration and limits</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 dark:text-gray-400">
                Feature management coming soon. For now, features are managed in plan snapshot JSON.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coupons Tab */}
        <TabsContent value="coupons" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Activation Codes</CardTitle>
                  <CardDescription>
                    Manage subscription activation coupons ({filteredCoupons.length} total)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search coupons..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64 dark:bg-slate-700"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={fetchCoupons}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700">
                      <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Code</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Plan</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Status</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Tenant</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Activated On</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Ends In</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Validity</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Usage</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Created By</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCoupons.map(coupon => (
                      <tr 
                        key={coupon.id}
                        className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30"
                      >
                        <td className="py-3 px-2">
                          <code className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                            {coupon.code}
                          </code>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-gray-900 dark:text-white">{coupon.plan.name}</span>
                        </td>
                        <td className="py-3 px-2">
                          <Badge className={getStatusBadgeColor(coupon.derived_status)}>
                            {getStatusLabel(coupon.derived_status)}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-gray-600 dark:text-gray-400">
                            {coupon.tenant?.name || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-gray-600 dark:text-gray-400">
                            {coupon.activated_on ? formatDate(coupon.activated_on) : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`text-sm ${
                            coupon.remaining_time?.expired 
                              ? 'text-red-600 dark:text-red-400' 
                              : 'text-green-600 dark:text-green-400'
                          }`}>
                            {coupon.remaining_time?.label || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(coupon.valid_from)} → {formatDate(coupon.valid_until)}
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-gray-600 dark:text-gray-400">{coupon.usage}</span>
                        </td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                          {coupon.creator.first_name} {coupon.creator.last_name?.[0]}.
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCoupon(coupon);
                                setShowDetailDrawer(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {coupon.derived_status === 'CREATED' && coupon.status !== 'REVOKED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => handleRevoke(coupon.id)}
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredCoupons.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-gray-500 dark:text-gray-400">
                          {searchQuery ? 'No coupons match your search' : 'No coupons found. Create one to get started.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Audit Log</CardTitle>
                  <CardDescription>Complete audit trail of coupon and subscription events</CardDescription>
                </div>
                <Button variant="outline" size="icon" onClick={fetchAuditLogs}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditLogs.map(log => (
                  <div 
                    key={log.id}
                    className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 flex items-start gap-4"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      log.event_type.includes('CREATED') ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                      log.event_type.includes('REVOKED') ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                      log.event_type.includes('REDEEMED') || log.event_type.includes('ACTIVATED') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {log.event_type.includes('CREATED') ? <Plus className="w-5 h-5" /> :
                       log.event_type.includes('REVOKED') ? <Ban className="w-5 h-5" /> :
                       log.event_type.includes('REDEEMED') || log.event_type.includes('ACTIVATED') ? <CheckCircle className="w-5 h-5" /> :
                       <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {getEventTypeLabel(log.event_type)}
                        </span>
                        {log.coupon && (
                          <code className="text-xs bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">
                            {log.coupon.code}
                          </code>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {log.actor && (
                          <span>by {log.actor.first_name} {log.actor.last_name}</span>
                        )}
                        {log.tenant && (
                          <span> • {log.tenant.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {formatDateTime(log.created_at)}
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No audit events yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateCouponModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchCoupons();
          fetchAuditLogs();
        }}
        plans={plans}
      />

      <CouponDetailDrawer
        coupon={selectedCoupon}
        isOpen={showDetailDrawer}
        onClose={() => {
          setShowDetailDrawer(false);
          setSelectedCoupon(null);
        }}
      />
    </div>
  );
}
