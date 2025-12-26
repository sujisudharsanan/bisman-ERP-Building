/**
 * BISMAN ERP - Micro-Unlock Subscription Types
 * 
 * TypeScript type definitions for the micro-unlock subscription system.
 * 
 * @module types/micro-unlock
 */

// ============================================================================
// ENUMS
// ============================================================================

export type UsagePeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'LIFETIME';

export type UnlockStatus = 'LOCKED' | 'UNLOCKED' | 'TRIAL' | 'EXPIRED';

export type InvoiceStatus = 
  | 'PENDING' 
  | 'GENERATED' 
  | 'SENT' 
  | 'PAID' 
  | 'OVERDUE' 
  | 'CANCELLED' 
  | 'REFUNDED';

export type FeatureStatus = 'OK' | 'NEAR_LIMIT' | 'LIMITED' | 'UNLOCKED';

export type HealthStatus = 'HEALTHY' | 'APPROACHING_LIMITS' | 'THROTTLED';

// ============================================================================
// FEATURE CATALOG
// ============================================================================

export interface FeatureCatalogEntry {
  id: number;
  feature_key: string;
  feature_name: string;
  description: string | null;
  category: string;
  default_limit: number;
  limit_period: UsagePeriod;
  base_price: number;
  currency: string;
  is_editable: boolean;
  is_active: boolean;
  requires_approval: boolean;
  icon: string | null;
  sort_order: number;
  display_on_pricing: boolean;
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

export interface UsageCounter {
  id: number;
  tenant_id: string;
  user_id: number | null;
  feature_key: string;
  usage_count: number;
  period: UsagePeriod;
  period_start: string;
  reset_at: string;
  peak_usage_count: number;
  peak_usage_date: string | null;
  total_lifetime_usage: number;
}

export interface FeatureAccessResult {
  allowed: boolean;
  reason: 'unlocked' | 'plan_included' | 'within_limit' | 'limit_exceeded' | 'feature_not_found';
  current_usage: number;
  usage_limit: number;
  is_unlocked: boolean;
  unlock_price: number;
  reset_in_seconds: number;
  message?: string;
  canUnlock?: boolean;
}

export interface FeatureUsage {
  feature_key: string;
  feature_name: string;
  category: string;
  default_limit: number;
  limit_period: UsagePeriod;
  base_price: number;
  icon: string | null;
  current_usage: number;
  lifetime_usage: number;
  reset_at: string | null;
  status: FeatureStatus;
  unlock_status: UnlockStatus | null;
  unlock_price: number | null;
  auto_renew: boolean | null;
}

// ============================================================================
// FEATURE UNLOCKS
// ============================================================================

export interface FeatureUnlock {
  id: number;
  tenant_id: string;
  feature_key: string;
  feature_name?: string;
  description?: string;
  category?: string;
  icon?: string;
  status: UnlockStatus;
  price_per_month: number;
  currency: string;
  start_date: string;
  end_date: string | null;
  auto_renew: boolean;
  billing_start_date: string | null;
  next_billing_date: string | null;
  last_billed_date: string | null;
  is_override: boolean;
  override_reason: string | null;
  unlocked_by: number;
  unlocked_at: string;
}

export interface UnlockResult {
  success: boolean;
  featureKey: string;
  featureName: string;
  pricePerMonth: number;
  billingStartDate: string;
  message: string;
}

// ============================================================================
// BILLING
// ============================================================================

export interface BillingLineItem {
  type: 'base_plan' | 'feature_unlock';
  name: string;
  amount: number;
  featureKey?: string;
  billingStart?: string;
}

export interface BillingSummary {
  tenantId: string;
  planName: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  basePlanAmount: number;
  unlockAmount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  lineItems: BillingLineItem[];
  activeUnlocks: number;
  nextBillingDate: string | null;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  tenant_id: string;
  billing_period_start: string;
  billing_period_end: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  line_items: BillingLineItem[];
  status: InvoiceStatus;
  invoice_date: string;
  due_date: string;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  pdf_url: string | null;
}

// ============================================================================
// SUBSCRIPTION PLANS
// ============================================================================

export interface SubscriptionPlan {
  id: number;
  plan_code: string;
  plan_name: string;
  description: string | null;
  base_price_monthly: number;
  base_price_yearly: number;
  currency: string;
  included_features: string[];
  feature_price_overrides: Record<string, number>;
  limit_multipliers: Record<string, number>;
  is_public: boolean;
  sort_order: number;
  badge_text: string | null;
  is_popular: boolean;
  is_active: boolean;
}

export interface TenantSubscription {
  id: number;
  tenant_id: string;
  plan_id: number | null;
  plan?: SubscriptionPlan;
  billing_cycle: 'MONTHLY' | 'YEARLY';
  billing_day: number;
  current_period_start: string | null;
  current_period_end: string | null;
  payment_status: 'PENDING' | 'PAID' | 'OVERDUE';
  last_payment_date: string | null;
  next_payment_date: string | null;
  is_active: boolean;
}

// ============================================================================
// RESOURCE CONSUMPTION
// ============================================================================

export interface ResourceConsumption {
  tenant_id: string;
  snapshot_date: string;
  total_users: number;
  active_users_30d: number;
  total_branches: number;
  tasks_created: number;
  payments_processed: number;
  reports_generated: number;
  reconciliations_run: number;
  db_storage_bytes: number;
  file_storage_bytes: number;
  api_calls_made: number;
}

export interface FormattedResources {
  users: {
    total: number;
    active: number;
  };
  branches: number;
  tasks: number;
  payments: number;
  reports: number;
  storage: {
    db: string;
    files: string;
  };
}

// ============================================================================
// AUDIT
// ============================================================================

export interface AuditLogEntry {
  id: number;
  tenant_id: string | null;
  action: string;
  action_category: 'unlock' | 'billing' | 'admin' | 'system';
  target_type: string | null;
  target_id: string | null;
  target_name: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  actor_type: 'user' | 'admin' | 'super_admin' | 'system';
  actor_id: number | null;
  actor_email: string | null;
  actor_name: string | null;
  created_at: string;
}

// ============================================================================
// SUBSCRIPTION PAGE DATA
// ============================================================================

export interface SubscriptionOverview {
  planName: string;
  billingCycle: string;
  estimatedBill: number;
  activeUnlocks: number;
  cycleEnds: string | null;
  currency: string;
}

export interface UsageHealthSummary {
  ok: number;
  nearLimit: number;
  limited: number;
  unlocked: number;
}

export interface SubscriptionHealth {
  status: HealthStatus;
  summary: UsageHealthSummary;
  featuresNearLimit: string[];
}

export interface SubscriptionPageData {
  overview: SubscriptionOverview;
  health: SubscriptionHealth;
  features: FeatureUsage[];
  unlocks: FeatureUnlock[];
  resources: FormattedResources;
  billing: {
    lineItems: BillingLineItem[];
    subtotal: number;
    total: number;
    currency: string;
  };
  invoices: Invoice[];
  plans: SubscriptionPlan[];
}

// ============================================================================
// UNLOCK PROMPT
// ============================================================================

export interface UnlockPromptData {
  featureKey: string;
  featureName: string;
  description?: string;
  currentUsage: number;
  usageLimit: number;
  resetInSeconds: number;
  unlockPrice: number;
  currency?: string;
}

export interface UnlockPromptAction {
  id: string;
  label: string;
  variant: 'primary' | 'secondary' | 'ghost';
  endpoint?: string;
  method?: string;
  action?: 'dismiss' | 'close';
}

export interface UnlockPromptResponse {
  ok: false;
  error: 'USAGE_LIMIT_EXCEEDED';
  errorCode: 'MICRO_UNLOCK_REQUIRED';
  featureKey: string;
  message: string;
  unlockPrompt: {
    show: boolean;
    title: string;
    description: string;
    unlockMessage: string;
    price: number;
    currency: string;
    billingNote: string;
    currentUsage: number;
    usageLimit: number;
    resetInSeconds: number;
    resetInHuman: string;
    actions: UnlockPromptAction[];
  };
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CatalogResponse {
  ok: boolean;
  features: FeatureCatalogEntry[];
  currency: string;
  defaultPrice: number;
}

export interface UsageSummaryResponse {
  ok: boolean;
  usage: FeatureUsage[];
  summary: UsageHealthSummary;
}

export interface UnlockedFeaturesResponse {
  ok: boolean;
  unlocks: FeatureUnlock[];
  count: number;
  totalMonthly: number;
}

export interface BillingSummaryResponse {
  ok: boolean;
  billing: BillingSummary;
}

export interface SubscriptionPageResponse {
  ok: boolean;
  data: SubscriptionPageData;
}

// ============================================================================
// REVENUE ANALYTICS (SuperAdmin)
// ============================================================================

export interface MonthlyRevenue {
  month: string;
  invoiceCount: number;
  revenue: number;
}

export interface FeatureRevenue {
  featureKey: string;
  featureName: string;
  category: string;
  tenantCount: number;
  monthlyRevenue: number;
}

export interface RevenueSummary {
  totalActiveUnlocks: number;
  tenantsWithUnlocks: number;
  mrr: number;
  churnedLast30Days: number;
}

export interface RevenueAnalytics {
  monthlyRevenue: MonthlyRevenue[];
  revenueByFeature: FeatureRevenue[];
  summary: RevenueSummary;
}
