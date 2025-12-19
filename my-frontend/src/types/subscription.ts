/**
 * Subscription and Admin Creation Types
 * =====================================
 * Types for the multi-tenant subscription management system
 */

// ============================================================================
// SUBSCRIPTION PLAN TYPES
// ============================================================================

export type SubscriptionPlanCode = 'BASIC' | 'STANDARD' | 'PRO' | 'ENTERPRISE';

export type BillingCycle = 'MONTHLY' | 'YEARLY';

export type SubscriptionState =
  | 'TRIAL'
  | 'ACTIVE'
  | 'UPGRADING'
  | 'DOWNGRADING'
  | 'GRACE_PERIOD'
  | 'SUSPENDED'
  | 'CANCELLED';

export interface SubscriptionPlan {
  code: SubscriptionPlanCode;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxStorageGb: number;
  maxBranches: number;
  maxApiCallsDay: number;
  trialDays: number;
  isUnlimited: boolean;
  features: PlanFeatures;
  limits: PlanLimits;
}

export interface PlanFeatures {
  // Core Features
  basicReporting: boolean;
  advancedReporting: boolean;
  customReporting: boolean;
  
  // Integration Features
  apiAccess: boolean;
  webhooks: boolean;
  ssoAuth: boolean;
  customIntegrations: boolean;
  
  // Support Features
  emailSupport: boolean;
  phoneSupport: boolean;
  dedicatedSupport: boolean;
  prioritySupport: boolean;
  
  // Advanced Features
  auditLogs: boolean;
  dataExport: boolean;
  customBranding: boolean;
  multiCurrency: boolean;
  
  // Module Access
  modules: string[];
}

export interface PlanLimits {
  maxUsers: number;
  maxBranches: number;
  maxStorageGb: number;
  maxApiCallsDay: number;
  maxCustomFields: number;
  maxReportsDay: number;
  maxExportsMonth: number;
  isUnlimited: boolean;
}

// ============================================================================
// ADMIN CREATION TYPES
// ============================================================================

export interface AdminCreationRequest {
  adminName: string;
  email: string;
  password: string;
  organizationName: string;
  subscriptionPlan: SubscriptionPlanCode;
  billingCycle: BillingCycle;
  billingStartDate: string;
  productType?: string;
  timezone?: string;
  currency?: string;
}

export interface AdminCreationResponse {
  ok: boolean;
  message?: string;
  error?: string;
  data?: {
    client: {
      id: string;
      code: string;
      name: string;
    };
    admin: {
      id: string;
      email: string;
      username: string;
    };
    subscription: {
      id: string;
      planCode: SubscriptionPlanCode;
      state: SubscriptionState;
      billingCycle: BillingCycle;
      trialEndsAt: string;
      currentPeriodStart: string;
      currentPeriodEnd: string;
    };
    branch: {
      id: string;
      code: string;
      name: string;
    };
  };
}

export interface EmailCheckRequest {
  email: string;
}

export interface EmailCheckResponse {
  ok: boolean;
  available: boolean;
  message?: string;
}

export interface ValidationRequest {
  adminName?: string;
  email?: string;
  password?: string;
  organizationName?: string;
}

export interface ValidationResponse {
  ok: boolean;
  valid: boolean;
  errors: {
    field: string;
    message: string;
  }[];
}

// ============================================================================
// ORGANIZATION TYPES
// ============================================================================

export interface Organization {
  id: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  subscription: OrganizationSubscription;
  admin: OrganizationAdmin;
  usage: OrganizationUsage;
}

export interface OrganizationSubscription {
  id: string;
  planCode: SubscriptionPlanCode;
  planName: string;
  state: SubscriptionState;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  price: number;
}

export interface OrganizationAdmin {
  id: string;
  email: string;
  username: string;
  fullName: string;
}

export interface OrganizationUsage {
  currentUsers: number;
  maxUsers: number;
  currentBranches: number;
  maxBranches: number;
  storageUsedGb: number;
  maxStorageGb: number;
  apiCallsToday: number;
  maxApiCallsDay: number;
}

export interface OrganizationListResponse {
  ok: boolean;
  organizations: Organization[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface OrganizationDetailResponse {
  ok: boolean;
  organization: Organization & {
    branches: Branch[];
    users: OrganizationUser[];
    subscriptionHistory: SubscriptionHistoryEntry[];
  };
}

// ============================================================================
// BRANCH & USER TYPES
// ============================================================================

export interface Branch {
  id: string;
  code: string;
  name: string;
  type: 'HUB' | 'SPOKE' | 'WAREHOUSE' | 'OFFICE';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  isActive: boolean;
  createdAt: string;
}

export interface OrganizationUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  roleCode: string;
  roleName: string;
  isActive: boolean;
  lastLogin: string | null;
  branches: {
    id: string;
    code: string;
    name: string;
    isPrimary: boolean;
  }[];
}

export interface UserBranchMapping {
  userId: string;
  branchId: string;
  isPrimary: boolean;
  accessLevel: 'FULL' | 'READ_ONLY' | 'RESTRICTED';
  assignedAt: string;
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT TYPES
// ============================================================================

export interface SubscriptionHistoryEntry {
  id: string;
  action: 'CREATED' | 'UPGRADED' | 'DOWNGRADED' | 'RENEWED' | 'CANCELLED' | 'SUSPENDED' | 'REACTIVATED';
  fromPlan: SubscriptionPlanCode | null;
  toPlan: SubscriptionPlanCode;
  changedAt: string;
  changedBy: string;
  reason?: string;
}

export interface SubscriptionUpgradeRequest {
  organizationId: string;
  newPlanCode: SubscriptionPlanCode;
  billingCycle?: BillingCycle;
  effectiveDate?: 'IMMEDIATE' | 'NEXT_BILLING_CYCLE';
}

export interface SubscriptionUpgradeResponse {
  ok: boolean;
  message?: string;
  error?: string;
  prorationAmount?: number;
  newSubscription?: OrganizationSubscription;
}

// ============================================================================
// ENFORCEMENT TYPES
// ============================================================================

export interface EnforcementResult {
  allowed: boolean;
  reason?: string;
  limitType?: 'USER' | 'BRANCH' | 'STORAGE' | 'API_CALLS' | 'FEATURE';
  current?: number;
  limit?: number;
  upgradeRequired?: boolean;
  suggestedPlan?: SubscriptionPlanCode;
}

export interface FeatureAccess {
  feature: string;
  hasAccess: boolean;
  reason?: string;
}

export interface UsageLimits {
  users: { current: number; max: number; percentage: number };
  branches: { current: number; max: number; percentage: number };
  storage: { current: number; max: number; percentage: number };
  apiCalls: { current: number; max: number; percentage: number };
}

// ============================================================================
// API RESPONSE WRAPPERS
// ============================================================================

export interface PlansResponse {
  ok: boolean;
  plans: SubscriptionPlan[];
}

export interface ToggleOrganizationStatusRequest {
  organizationId: string;
  isActive: boolean;
  reason?: string;
}

export interface ToggleOrganizationStatusResponse {
  ok: boolean;
  message: string;
  newStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface UpdateSubscriptionRequest {
  organizationId: string;
  planCode?: SubscriptionPlanCode;
  billingCycle?: BillingCycle;
  action?: 'UPGRADE' | 'DOWNGRADE' | 'RENEW' | 'CANCEL' | 'SUSPEND' | 'REACTIVATE';
}

export interface UpdateSubscriptionResponse {
  ok: boolean;
  message: string;
  subscription: OrganizationSubscription;
}
