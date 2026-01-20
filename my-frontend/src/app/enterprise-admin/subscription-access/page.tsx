'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SUBSCRIPTION ACCESS CONTROL PAGE
 * Enterprise Admin Panel - Premium Feature
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 3-Tab Interface:
 * - Tab 1: Plan Module Matrix (What modules each plan can access)
 * - Tab 2: Feature Limits (How much of each feature per plan)
 * - Tab 3: Tenant Debugger (Support tool for tenant access analysis)
 * 
 * Staging State: All changes save to draft tables until "Publish to Production"
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import { 
  Shield, 
  Key, 
  Upload,
  Clock,
  Grid3X3,
  Sliders,
  Search,
  RefreshCw,
  Check,
  X,
  Eye,
  Lock,
  Unlock,
  AlertTriangle,
  Building2,
  User,
  ChevronDown,
  ChevronRight,
  Loader2,
  RotateCcw,
  History,
  Info,
  Zap,
  Ban,
  Pencil,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';

// ============================================================================
// Types
// ============================================================================

interface Plan {
  id: number;
  plan_code: string;
  code?: string; // For master_subscription_plans
  name: string;
  sort_order: number;
}

interface Module {
  id: number;
  module_code: string;
  display_name: string;
  icon: string;
  sort_order: number;
  layout_group: string;
}

interface ModuleAccess {
  id: number;
  plan_id: number;
  module_id: string;
  access_level: 'none' | 'read' | 'full';
  page_limit: number;
  is_dirty?: boolean;
  draft_action?: string;
}

interface Feature {
  id: number;
  feature_code: string;
  feature_name: string;
  description: string;
  category: string;
  icon: string;
}

interface FeatureControl {
  id: number;
  plan_id: number;
  feature_code: string;
  free_limit: number;
  limit_period: string;
  unlock_price: number;
  unlock_unit: string;
  currency: string;
  lock_mode: 'none' | 'soft' | 'hard';
  requires_approval: boolean;
  is_dirty?: boolean;
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  plan_id: number;
  plan_code: string;
  plan_name: string;
  subscription_state: string;
}

interface TenantAccess {
  module_code: string;
  display_name: string;
  icon: string;
  layout_group: string;
  plan_access: string;
  has_override: boolean;
  override_type: string | null;
  override_reason: string | null;
  effective_access: string;
  source: 'PLAN' | 'OVERRIDE';
}

interface PublishStatus {
  pendingModuleChanges: number;
  pendingFeatureChanges: number;
  totalPending: number;
  lastPublish: {
    published_at: string;
    published_by: number;
    publish_type: string;
    total_changes: number;
    notes: string;
  } | null;
}

// ============================================================================
// Access Level Component
// ============================================================================

const AccessLevelCell = ({ 
  level, 
  onChange, 
  isDirty,
  isLoading 
}: { 
  level: 'none' | 'read' | 'full';
  onChange: (newLevel: 'none' | 'read' | 'full') => void;
  isDirty?: boolean;
  isLoading?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const colors = {
    none: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
    read: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30',
    full: 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30',
  };

  const icons = {
    none: <Ban className="w-3 h-3" />,
    read: <Eye className="w-3 h-3" />,
    full: <Check className="w-3 h-3" />,
  };

  const labels = {
    none: 'None',
    read: 'Read',
    full: 'Full',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`
          flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium
          transition-all duration-200 cursor-pointer
          ${colors[level]}
          ${isDirty ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-900' : ''}
          ${isLoading ? 'opacity-50 cursor-wait' : ''}
        `}
      >
        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : icons[level]}
        <span>{labels[level]}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute z-20 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden min-w-[100px]">
            {(['none', 'read', 'full'] as const).map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-xs font-medium
                  hover:bg-slate-700 transition-colors
                  ${level === option ? 'bg-slate-700' : ''}
                `}
              >
                <span className={colors[option].split(' ')[1]}>{icons[option]}</span>
                <span className="text-slate-200">{labels[option]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// Lock Mode Component
// ============================================================================

const LockModeToggle = ({ 
  mode, 
  onChange,
  isDirty 
}: { 
  mode: 'none' | 'soft' | 'hard';
  onChange: (mode: 'none' | 'soft' | 'hard') => void;
  isDirty?: boolean;
}) => {
  const modes = {
    none: { label: 'None', icon: Unlock, color: 'text-slate-400' },
    soft: { label: 'Soft', icon: AlertTriangle, color: 'text-yellow-400' },
    hard: { label: 'Hard', icon: Lock, color: 'text-red-400' },
  };

  const current = modes[mode];
  const Icon = current.icon;

  return (
    <button
      onClick={() => {
        const next = mode === 'none' ? 'soft' : mode === 'soft' ? 'hard' : 'none';
        onChange(next);
      }}
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded-md border border-slate-600
        hover:bg-slate-700 transition-all text-xs font-medium
        ${isDirty ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-900' : ''}
      `}
    >
      <Icon className={`w-3.5 h-3.5 ${current.color}`} />
      <span className={current.color}>{current.label}</span>
    </button>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export default function SubscriptionAccessControlPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('module-matrix');
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<PublishStatus | null>(null);

  // Module Matrix State
  const [plans, setPlans] = useState<Plan[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [draftAccess, setDraftAccess] = useState<ModuleAccess[]>([]);
  const [loadingCells, setLoadingCells] = useState<Set<string>>(new Set());

  // Feature Limits State
  const [features, setFeatures] = useState<Feature[]>([]);
  const [masterPlans, setMasterPlans] = useState<Plan[]>([]);
  const [draftControls, setDraftControls] = useState<FeatureControl[]>([]);
  const [expandedPlans, setExpandedPlans] = useState<Set<number>>(new Set());

  // Tenant Debugger State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantAccess, setTenantAccess] = useState<TenantAccess[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchPublishStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/enterprise-admin/subscriptions/publish/status`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setPublishStatus(data.data);
      }
    } catch (error) {
      console.error('Error fetching publish status:', error);
    }
  }, []);

  const fetchModuleMatrix = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/enterprise-admin/subscriptions/module-matrix`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setPlans(data.data.plans);
        setModules(data.data.modules);
        setDraftAccess(data.data.draftAccess);
      }
    } catch (error) {
      console.error('Error fetching module matrix:', error);
      toast({ title: 'Error loading module matrix', variant: 'destructive' });
    }
  }, [toast]);

  const fetchFeatureLimits = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/enterprise-admin/subscriptions/feature-limits`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setFeatures(data.data.features);
        setMasterPlans(data.data.plans);
        setDraftControls(data.data.draftControls);
        // Auto-expand first plan
        if (data.data.plans.length > 0) {
          setExpandedPlans(new Set([data.data.plans[0].id]));
        }
      }
    } catch (error) {
      console.error('Error fetching feature limits:', error);
      toast({ title: 'Error loading feature limits', variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchPublishStatus(),
        fetchModuleMatrix(),
        fetchFeatureLimits(),
      ]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchPublishStatus, fetchModuleMatrix, fetchFeatureLimits]);

  // ============================================================================
  // Module Matrix Actions
  // ============================================================================

  const updateModuleAccess = async (planId: number, moduleId: string, accessLevel: 'none' | 'read' | 'full') => {
    const cellKey = `${planId}-${moduleId}`;
    setLoadingCells(prev => new Set(prev).add(cellKey));

    try {
      const res = await fetch(`${API_BASE}/api/enterprise-admin/subscriptions/module-access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planId, moduleId, accessLevel, modifiedBy: 1 }), // TODO: Get actual user ID
      });
      
      const data = await res.json();
      if (data.success) {
        // Update local state
        setDraftAccess(prev => {
          const existing = prev.find(a => a.plan_id === planId && a.module_id === moduleId);
          if (existing) {
            return prev.map(a => 
              a.plan_id === planId && a.module_id === moduleId 
                ? { ...a, access_level: accessLevel, is_dirty: true }
                : a
            );
          }
          return [...prev, { 
            id: 0, plan_id: planId, module_id: moduleId, 
            access_level: accessLevel, page_limit: -1, is_dirty: true 
          }];
        });
        fetchPublishStatus();
      } else {
        toast({ title: 'Failed to update', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error updating module access:', error);
      toast({ title: 'Error updating access', variant: 'destructive' });
    } finally {
      setLoadingCells(prev => {
        const next = new Set(prev);
        next.delete(cellKey);
        return next;
      });
    }
  };

  // ============================================================================
  // Feature Limits Actions
  // ============================================================================

  const updateFeatureLimit = async (planId: number, featureCode: string, updates: Partial<FeatureControl>) => {
    try {
      const res = await fetch(`${API_BASE}/api/enterprise-admin/subscriptions/feature-limit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planId, featureCode, ...updates, modifiedBy: 1 }),
      });
      
      const data = await res.json();
      if (data.success) {
        setDraftControls(prev => prev.map(c => 
          c.plan_id === planId && c.feature_code === featureCode
            ? { ...c, ...updates, is_dirty: true }
            : c
        ));
        fetchPublishStatus();
        toast({ title: 'Draft updated' });
      }
    } catch (error) {
      console.error('Error updating feature limit:', error);
      toast({ title: 'Error updating limit', variant: 'destructive' });
    }
  };

  // ============================================================================
  // Tenant Debugger Actions
  // ============================================================================

  const searchTenants = async () => {
    if (searchQuery.length < 2) return;
    setIsSearching(true);

    try {
      const res = await fetch(`${API_BASE}/api/enterprise-admin/subscriptions/tenants/search?q=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (error) {
      console.error('Error searching tenants:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const loadTenantAccess = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setSearchResults([]);
    setSearchQuery('');

    try {
      const res = await fetch(`${API_BASE}/api/enterprise-admin/subscriptions/tenants/${tenant.id}/access`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setTenantAccess(data.data.effectiveAccess);
      }
    } catch (error) {
      console.error('Error loading tenant access:', error);
      toast({ title: 'Error loading tenant data', variant: 'destructive' });
    }
  };

  // ============================================================================
  // Publish Actions
  // ============================================================================

  const publishToProduction = async () => {
    if (!publishStatus?.totalPending) {
      toast({ title: 'No changes to publish' });
      return;
    }

    setIsPublishing(true);
    try {
      const res = await fetch(`${API_BASE}/api/enterprise-admin/subscriptions/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          publishedBy: 1, // TODO: Get actual user ID
          notes: 'Published from Access Control page',
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ 
          title: '✅ Published to Production',
          description: `${data.data.totalChanges} changes applied`,
        });
        // Refresh all data
        await Promise.all([
          fetchPublishStatus(),
          fetchModuleMatrix(),
          fetchFeatureLimits(),
        ]);
      } else {
        toast({ title: 'Publish failed', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error publishing:', error);
      toast({ title: 'Error publishing changes', variant: 'destructive' });
    } finally {
      setIsPublishing(false);
    }
  };

  const discardChanges = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/enterprise-admin/subscriptions/discard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Changes discarded' });
        await Promise.all([
          fetchPublishStatus(),
          fetchModuleMatrix(),
          fetchFeatureLimits(),
        ]);
      }
    } catch (error) {
      console.error('Error discarding:', error);
      toast({ title: 'Error discarding changes', variant: 'destructive' });
    }
  };

  // ============================================================================
  // Group modules by layout_group
  // ============================================================================

  const groupedModules = useMemo(() => {
    const groups: Record<string, Module[]> = {};
    modules.forEach(mod => {
      const group = mod.layout_group || 'Other';
      if (!groups[group]) groups[group] = [];
      groups[group].push(mod);
    });
    return groups;
  }, [modules]);

  // ============================================================================
  // Group features by category
  // ============================================================================

  const groupedFeatures = useMemo(() => {
    const groups: Record<string, Feature[]> = {};
    features.forEach(feat => {
      const cat = feat.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(feat);
    });
    return groups;
  }, [features]);

  // ============================================================================
  // Get access level for a cell
  // ============================================================================

  const getAccessLevel = (planId: number, moduleId: string): 'none' | 'read' | 'full' => {
    const access = draftAccess.find(a => a.plan_id === planId && a.module_id === moduleId);
    return access?.access_level || 'none';
  };

  const isDirty = (planId: number, moduleId: string): boolean => {
    const access = draftAccess.find(a => a.plan_id === planId && a.module_id === moduleId);
    return access?.is_dirty || false;
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-slate-400">Loading Subscription Access Control...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Subscription Access Control</h1>
                <p className="text-sm text-slate-400">Manage plan modules, features, and tenant overrides</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Pending Changes Badge */}
              {publishStatus && publishStatus.totalPending > 0 && (
                <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/40 px-3 py-1">
                  <Pencil className="w-3 h-3 mr-1.5" />
                  {publishStatus.totalPending} pending changes
                </Badge>
              )}

              {/* Last Published */}
              {publishStatus?.lastPublish && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Last Published: {new Date(publishStatus.lastPublish.published_at).toLocaleString()}</span>
                </div>
              )}

              {/* Discard Button */}
              {publishStatus && publishStatus.totalPending > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={discardChanges}
                  className="border-slate-600 hover:bg-slate-800"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Discard
                </Button>
              )}

              {/* Publish Button */}
              <Button
                onClick={publishToProduction}
                disabled={isPublishing || !publishStatus?.totalPending}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold px-5"
              >
                {isPublishing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Publish to Production
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700 p-1 rounded-xl">
            <TabsTrigger 
              value="module-matrix" 
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white rounded-lg px-6 py-2.5 transition-all"
            >
              <Grid3X3 className="w-4 h-4 mr-2" />
              Plan Module Matrix
              {publishStatus && publishStatus.pendingModuleChanges > 0 && (
                <Badge className="ml-2 bg-blue-500/20 text-blue-400 text-xs">
                  {publishStatus.pendingModuleChanges}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="feature-limits"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white rounded-lg px-6 py-2.5 transition-all"
            >
              <Sliders className="w-4 h-4 mr-2" />
              Feature Limits
              {publishStatus && publishStatus.pendingFeatureChanges > 0 && (
                <Badge className="ml-2 bg-blue-500/20 text-blue-400 text-xs">
                  {publishStatus.pendingFeatureChanges}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="tenant-debugger"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white rounded-lg px-6 py-2.5 transition-all"
            >
              <Search className="w-4 h-4 mr-2" />
              Tenant Debugger
            </TabsTrigger>
          </TabsList>

          {/* ================================================================
              TAB 1: PLAN MODULE MATRIX
          ================================================================ */}
          <TabsContent value="module-matrix" className="space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Grid3X3 className="w-5 h-5 text-purple-400" />
                  Module Access by Plan
                </CardTitle>
                <CardDescription>
                  Configure which modules are available in each subscription plan. 
                  <span className="text-red-400 ml-1">Red = None</span>, 
                  <span className="text-yellow-400 ml-1">Yellow = Read-Only</span>, 
                  <span className="text-green-400 ml-1">Green = Full Access</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="sticky left-0 z-10 bg-slate-900 text-left px-4 py-3 text-sm font-semibold text-slate-300 min-w-[200px]">
                          Module
                        </th>
                        {plans.map(plan => (
                          <th key={plan.id} className="px-3 py-3 text-center text-sm font-semibold text-slate-300 min-w-[100px]">
                            <div className="flex flex-col items-center gap-1">
                              <span>{plan.name}</span>
                              <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-600">
                                {plan.plan_code}
                              </Badge>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(groupedModules).map(([group, mods]) => (
                        <React.Fragment key={group}>
                          {/* Group Header */}
                          <tr className="bg-slate-800/50">
                            <td 
                              colSpan={plans.length + 1} 
                              className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider"
                            >
                              {group}
                            </td>
                          </tr>
                          {/* Module Rows */}
                          {mods.map(mod => (
                            <tr key={mod.module_code} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                              <td className="sticky left-0 z-10 bg-slate-900 px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                                    <Zap className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-slate-200">{mod.display_name}</div>
                                    <div className="text-xs text-slate-500">{mod.module_code}</div>
                                  </div>
                                </div>
                              </td>
                              {plans.map(plan => {
                                const cellKey = `${plan.id}-${mod.module_code}`;
                                return (
                                  <td key={plan.id} className="px-3 py-3 text-center">
                                    <div className="flex justify-center">
                                      <AccessLevelCell
                                        level={getAccessLevel(plan.id, mod.module_code)}
                                        onChange={(level) => updateModuleAccess(plan.id, mod.module_code, level)}
                                        isDirty={isDirty(plan.id, mod.module_code)}
                                        isLoading={loadingCells.has(cellKey)}
                                      />
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================
              TAB 2: FEATURE LIMITS
          ================================================================ */}
          <TabsContent value="feature-limits" className="space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-blue-400" />
                  Feature Limits by Plan
                </CardTitle>
                <CardDescription>
                  Set limits, lock modes, and unlock prices for each feature per plan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {masterPlans.map(plan => {
                  const isExpanded = expandedPlans.has(plan.id);
                  const planControls = draftControls.filter(c => c.plan_id === plan.id);
                  const dirtyCount = planControls.filter(c => c.is_dirty).length;
                  // Count allowed features: lock_mode is 'none' and has a positive limit or unlimited (-1)
                  const allowedCount = planControls.filter(c => 
                    c.lock_mode === 'none' && (c.free_limit > 0 || c.free_limit === -1)
                  ).length;

                  return (
                    <div key={plan.id} className="border border-slate-700 rounded-xl overflow-hidden">
                      {/* Plan Header */}
                      <button
                        onClick={() => {
                          setExpandedPlans(prev => {
                            const next = new Set(prev);
                            if (next.has(plan.id)) next.delete(plan.id);
                            else next.add(plan.id);
                            return next;
                          });
                        }}
                        className="w-full flex items-center justify-between px-5 py-4 bg-slate-800/50 hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          )}
                          <span className="font-semibold text-white">{plan.name}</span>
                          <Badge variant="outline" className="text-slate-400 border-slate-600">
                            {plan.code}
                          </Badge>
                          {dirtyCount > 0 && (
                            <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                              {dirtyCount} changes
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-slate-500">
                          <span className="text-emerald-400 font-medium">{allowedCount}</span>
                          <span className="text-slate-600"> / </span>
                          <span>{planControls.length}</span>
                          <span className="ml-1">features allowed</span>
                        </span>
                      </button>

                      {/* Feature Controls */}
                      {isExpanded && (
                        <div className="divide-y divide-slate-800">
                          {Object.entries(groupedFeatures).map(([category, feats]) => {
                            // Sort features: allowed first (lock_mode='none' with limit), locked at bottom
                            const sortedFeats = [...feats].sort((a, b) => {
                              const controlA = planControls.find(c => c.feature_code === a.feature_code);
                              const controlB = planControls.find(c => c.feature_code === b.feature_code);
                              const isAllowedA = controlA && controlA.lock_mode === 'none' && (controlA.free_limit > 0 || controlA.free_limit === -1);
                              const isAllowedB = controlB && controlB.lock_mode === 'none' && (controlB.free_limit > 0 || controlB.free_limit === -1);
                              if (isAllowedA && !isAllowedB) return -1;
                              if (!isAllowedA && isAllowedB) return 1;
                              return 0;
                            });

                            return (
                            <div key={category} className="p-4">
                              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                {category}
                              </div>
                              <div className="space-y-2">
                                {sortedFeats.map(feat => {
                                  const control = planControls.find(c => c.feature_code === feat.feature_code);
                                  if (!control) return null;
                                  const isAllowed = control.lock_mode === 'none' && (control.free_limit > 0 || control.free_limit === -1);
                                  const isUnlimited = control.free_limit === -1;

                                  return (
                                    <div 
                                      key={feat.feature_code}
                                      className={`
                                        flex items-center justify-between px-4 py-3 rounded-lg
                                        ${isAllowed ? 'bg-slate-800/50' : 'bg-slate-900/50 opacity-60'}
                                        ${control.is_dirty ? 'ring-1 ring-blue-500/50' : ''}
                                      `}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isAllowed ? 'bg-emerald-900/50' : 'bg-slate-700'}`}>
                                          {isAllowed ? (
                                            <Check className="w-4 h-4 text-emerald-400" />
                                          ) : (
                                            <Ban className="w-4 h-4 text-slate-500" />
                                          )}
                                        </div>
                                        <div>
                                          <div className={`text-sm font-medium ${isAllowed ? 'text-slate-200' : 'text-slate-400'}`}>{feat.feature_name}</div>
                                          <div className="text-xs text-slate-500">{feat.feature_code}</div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-6">
                                        {/* Limit Input - Show ∞ for unlimited */}
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-slate-500">Limit:</span>
                                          {isUnlimited ? (
                                            <button
                                              onClick={() => updateFeatureLimit(plan.id, feat.feature_code, { free_limit: 100 })}
                                              className="w-20 h-8 text-lg font-bold text-emerald-400 bg-slate-700 border border-slate-600 rounded-md hover:bg-slate-600 transition-colors flex items-center justify-center"
                                              title="Unlimited - Click to set a specific limit"
                                            >
                                              ∞
                                            </button>
                                          ) : (
                                            <div className="relative">
                                              <Input
                                                type="number"
                                                value={control.free_limit}
                                                onChange={(e) => updateFeatureLimit(plan.id, feat.feature_code, { 
                                                  free_limit: parseInt(e.target.value) || 0 
                                                })}
                                                className="w-20 h-8 text-sm bg-slate-700 border-slate-600 pr-7"
                                              />
                                              <button
                                                onClick={() => updateFeatureLimit(plan.id, feat.feature_code, { free_limit: -1 })}
                                                className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                                                title="Set unlimited"
                                              >
                                                ∞
                                              </button>
                                            </div>
                                          )}
                                        </div>

                                        {/* Lock Mode */}
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-slate-500">Lock:</span>
                                          <LockModeToggle
                                            mode={control.lock_mode}
                                            onChange={(mode) => updateFeatureLimit(plan.id, feat.feature_code, { lock_mode: mode })}
                                            isDirty={control.is_dirty}
                                          />
                                        </div>

                                        {/* Unlock Price */}
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-slate-500">Unlock ₹:</span>
                                          <Input
                                            type="number"
                                            value={control.unlock_price}
                                            onChange={(e) => updateFeatureLimit(plan.id, feat.feature_code, { 
                                              unlock_price: parseFloat(e.target.value) || 0 
                                            })}
                                            className="w-24 h-8 text-sm bg-slate-700 border-slate-600"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================
              TAB 3: TENANT DEBUGGER
          ================================================================ */}
          <TabsContent value="tenant-debugger" className="space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-emerald-400" />
                  Tenant Access Debugger
                </CardTitle>
                <CardDescription>
                  Search for a tenant to view their calculated module access, distinguishing between plan-based and override-based permissions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search Bar */}
                <div className="flex gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      placeholder="Search by tenant name, email, or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchTenants()}
                      className="pl-10 bg-slate-800 border-slate-700"
                    />
                  </div>
                  <Button 
                    onClick={searchTenants}
                    disabled={searchQuery.length < 2 || isSearching}
                    className="bg-slate-700 hover:bg-slate-600"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                  </Button>
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="border border-slate-700 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    {searchResults.map(tenant => (
                      <button
                        key={tenant.id}
                        onClick={() => loadTenantAccess(tenant)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-slate-500" />
                          <div className="text-left">
                            <div className="text-sm font-medium text-slate-200">{tenant.name}</div>
                            <div className="text-xs text-slate-500">{tenant.email}</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-slate-400 border-slate-600">
                          {tenant.plan_name || 'No Plan'}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Tenant Dashboard */}
                {selectedTenant && (
                  <div className="space-y-4">
                    {/* Tenant Info Card */}
                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-white text-lg">{selectedTenant.name}</div>
                          <div className="text-sm text-slate-400">{selectedTenant.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Current Plan</div>
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/40">
                            {selectedTenant.plan_name || 'No Plan'}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Status</div>
                          <Badge 
                            className={
                              selectedTenant.subscription_state === 'ACTIVE' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-yellow-500/20 text-yellow-400'
                            }
                          >
                            {selectedTenant.subscription_state || 'Unknown'}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTenant(null)}
                          className="border-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Access Matrix */}
                    <div className="border border-slate-700 rounded-xl overflow-hidden">
                      <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700">
                        <h3 className="font-semibold text-white">Calculated Module Access</h3>
                      </div>
                      <div className="divide-y divide-slate-800">
                        {tenantAccess.map(access => (
                          <div 
                            key={access.module_code}
                            className="flex items-center justify-between px-4 py-3 hover:bg-slate-800/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`
                                w-8 h-8 rounded-lg flex items-center justify-center
                                ${access.effective_access === 'full' ? 'bg-green-500/20' : 
                                  access.effective_access === 'read' ? 'bg-yellow-500/20' : 'bg-red-500/20'}
                              `}>
                                {access.effective_access === 'full' ? (
                                  <Check className="w-4 h-4 text-green-400" />
                                ) : access.effective_access === 'read' ? (
                                  <Eye className="w-4 h-4 text-yellow-400" />
                                ) : (
                                  <Ban className="w-4 h-4 text-red-400" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-slate-200">{access.display_name}</div>
                                <div className="text-xs text-slate-500">{access.module_code}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              {/* Source Badge */}
                              <Badge 
                                variant="outline"
                                className={
                                  access.source === 'OVERRIDE' 
                                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' 
                                    : 'bg-slate-700 text-slate-400 border-slate-600'
                                }
                              >
                                {access.source === 'OVERRIDE' ? (
                                  <>
                                    <Zap className="w-3 h-3 mr-1" />
                                    Override
                                  </>
                                ) : (
                                  <>
                                    <Shield className="w-3 h-3 mr-1" />
                                    Plan
                                  </>
                                )}
                              </Badge>

                              {/* Plan Access */}
                              <div className="text-right min-w-[80px]">
                                <div className="text-[10px] text-slate-500 uppercase">Plan</div>
                                <span className={`text-xs font-medium ${
                                  access.plan_access === 'full' ? 'text-green-400' :
                                  access.plan_access === 'read' ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  {access.plan_access}
                                </span>
                              </div>

                              {/* Effective Access */}
                              <div className="text-right min-w-[80px]">
                                <div className="text-[10px] text-slate-500 uppercase">Effective</div>
                                <span className={`text-xs font-semibold ${
                                  access.effective_access === 'full' ? 'text-green-400' :
                                  access.effective_access === 'read' ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  {access.effective_access.toUpperCase()}
                                </span>
                              </div>

                              {/* Override Reason */}
                              {access.has_override && access.override_reason && (
                                <div className="max-w-[200px]">
                                  <div className="text-[10px] text-slate-500 uppercase">Reason</div>
                                  <div className="text-xs text-orange-400 truncate" title={access.override_reason}>
                                    {access.override_reason}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Info Panel */}
                    <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-300">
                        <strong>How it works:</strong> Effective access is calculated by first checking tenant-specific overrides. 
                        If no override exists, the plan-based access level is used. Overrides can grant (upgrade) or revoke (downgrade) access.
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!selectedTenant && searchResults.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                      <User className="w-8 h-8 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-400 mb-2">No Tenant Selected</h3>
                    <p className="text-sm text-slate-500 max-w-md">
                      Search for a tenant above to view their calculated module access and identify whether permissions come from their plan or manual overrides.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
