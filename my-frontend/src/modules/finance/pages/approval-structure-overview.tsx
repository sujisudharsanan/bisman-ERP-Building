'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { useAuth } from '@/common/hooks/useAuth';
import { 
  RefreshCw, 
  ChevronRight, 
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Settings,
  Users,
  Zap,
  ChevronDown
} from '@/lib/ssr-safe-icons';

// Types
interface WorkflowTemplate {
  id: string;
  name: string;
  code: string;
  description: string | null;
  entityType: string;
  version: number;
  isActive: boolean;
  isDefault: boolean;
  expiryDays: number;
  maxRejectionCount: number;
}

interface WorkflowStage {
  id: string;
  name: string;
  code: string;
  description: string | null;
  stageOrder: number;
  assigneeType: string;
  assignedRole: string | null;
  fallbackStrategy: string;
  slaHours: number;
  escalationHours: number;
  isOptional: boolean;
  isConditional: boolean;
  minAmount: number | null;
  maxAmount: number | null;
}

// Fallback strategy explanations
const fallbackExplanations: Record<string, { label: string; description: string; color: string }> = {
  auto_assign_admin: {
    label: 'Assign to Admin',
    description: 'If no eligible approver is found, the stage is automatically assigned to a Client Admin',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  auto_approve: {
    label: 'Auto-Approve',
    description: 'If no eligible approver is found, the stage is automatically approved by the system',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  escalate_to_owner: {
    label: 'Escalate to Owner',
    description: 'If no eligible approver is found, escalate to the business owner',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  },
  skip_stage: {
    label: 'Skip Stage',
    description: 'If no eligible approver is found, skip this stage entirely',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  },
  block_and_notify: {
    label: 'Block & Notify',
    description: 'If no eligible approver is found, block the workflow and notify administrators',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
};

// Assignee type explanations
const assigneeTypeExplanations: Record<string, { label: string; icon: React.ReactNode }> = {
  specific_user: { label: 'Specific User', icon: <Users className="w-4 h-4" /> },
  role: { label: 'Role-Based', icon: <Users className="w-4 h-4" /> },
  department_head: { label: 'Department Head', icon: <Users className="w-4 h-4" /> },
  initiator_manager: { label: "Initiator's Manager", icon: <Users className="w-4 h-4" /> },
  dynamic: { label: 'Dynamic (System)', icon: <Settings className="w-4 h-4" /> },
};

export default function ApprovalStructureOverview() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/approvals/admin/templates', {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user?.id || ''),
          'x-enterprise-id': '',
          'x-user-role': user?.role || user?.roleName || 'USER',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch workflow templates');
      }

      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.data.templates || []);
        if (data.data.templates?.length > 0) {
          setSelectedTemplate(data.data.templates[0]);
        }
      } else {
        throw new Error('Failed to load workflow templates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch stages for selected template
  const fetchStages = useCallback(async (templateId: string) => {
    try {
      setLoadingStages(true);

      const response = await fetch(`/api/approvals/admin/templates/${templateId}/stages`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user?.id || ''),
          'x-enterprise-id': '',
          'x-user-role': user?.role || user?.roleName || 'USER',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch workflow stages');
      }

      const data = await response.json();
      
      if (data.success) {
        setStages(data.data.stages || []);
      }
    } catch (err) {
      console.error('Failed to fetch stages:', err);
    } finally {
      setLoadingStages(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (selectedTemplate) {
      fetchStages(selectedTemplate.id);
    }
  }, [selectedTemplate, fetchStages]);

  // Format currency
  const formatAmount = (amount: number | null) => {
    if (amount === null) return 'Any';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <SuperAdminLayout
      title="Approval Structure Overview"
      description="Understand how approval workflows are configured for your organization"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Approval Structure Overview
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Learn how approvals work in your organization
            </p>
          </div>
          <button
            onClick={fetchTemplates}
            disabled={loading}
            className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Educational Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100">Stage-Based Workflows</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Approvals progress through defined stages in order. Each stage has its own approver and rules.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900 dark:text-green-100">Smart Fallbacks</h4>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  If an approver is unavailable, the system automatically applies fallback strategies to keep workflows moving.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900 dark:text-purple-100">Amount-Based Routing</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  Some stages only activate for transactions above certain amounts, ensuring proper oversight.
                </p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading workflow templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Workflow Templates Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Your organization doesn't have any approval workflow templates configured yet.
              Contact your administrator to set up approval workflows.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template List */}
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Workflow Templates
              </h3>
              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {template.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-1">
                          {template.entityType.replace('_', ' ')}
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                        selectedTemplate?.id === template.id ? 'rotate-90' : ''
                      }`} />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {template.isDefault && (
                        <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded">
                          Default
                        </span>
                      )}
                      {template.isActive && (
                        <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded">
                          Active
                        </span>
                      )}
                      <span className="text-xs text-gray-400">v{template.version}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Stage Details */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              {selectedTemplate ? (
                <>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {selectedTemplate.name}
                    </h3>
                    {selectedTemplate.description && (
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {selectedTemplate.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                      <span>Expires after: {selectedTemplate.expiryDays} days</span>
                      <span>Max rejections: {selectedTemplate.maxRejectionCount}</span>
                    </div>
                  </div>

                  {loadingStages ? (
                    <div className="text-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                    </div>
                  ) : stages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No stages configured for this workflow
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300">
                        Approval Stages ({stages.length})
                      </h4>
                      
                      {stages.map((stage, index) => (
                        <div key={stage.id}>
                          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium text-sm">
                                  {stage.stageOrder}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {stage.name}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                    {stage.code}
                                  </div>
                                  {stage.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {stage.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {stage.isOptional && (
                                  <span className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                                    Optional
                                  </span>
                                )}
                                {stage.isConditional && (
                                  <span className="text-xs bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300 px-2 py-0.5 rounded">
                                    Conditional
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">
                                  Assigned To
                                </span>
                                <div className="flex items-center gap-1">
                                  {assigneeTypeExplanations[stage.assigneeType]?.icon}
                                  <span className="text-gray-900 dark:text-gray-100">
                                    {stage.assignedRole || assigneeTypeExplanations[stage.assigneeType]?.label || stage.assigneeType}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">
                                  Fallback Strategy
                                </span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                                  fallbackExplanations[stage.fallbackStrategy]?.color || 'bg-gray-100 text-gray-800'
                                }`}>
                                  <Zap className="w-3 h-3" />
                                  {fallbackExplanations[stage.fallbackStrategy]?.label || stage.fallbackStrategy}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">
                                  SLA
                                </span>
                                <span className="text-gray-900 dark:text-gray-100">
                                  {stage.slaHours}h / Escalate: {stage.escalationHours}h
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">
                                  Amount Range
                                </span>
                                <span className="text-gray-900 dark:text-gray-100">
                                  {stage.minAmount !== null || stage.maxAmount !== null
                                    ? `${formatAmount(stage.minAmount)} - ${formatAmount(stage.maxAmount)}`
                                    : 'All amounts'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Arrow between stages */}
                          {index < stages.length - 1 && (
                            <div className="flex justify-center py-2">
                              <ChevronDown className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Select a workflow template to view its stages
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fallback Strategy Legend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Fallback Strategies Explained
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(fallbackExplanations).map(([key, value]) => (
              <div key={key} className="flex items-start gap-3">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${value.color}`}>
                  <Zap className="w-3 h-3" />
                  {value.label}
                </span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
