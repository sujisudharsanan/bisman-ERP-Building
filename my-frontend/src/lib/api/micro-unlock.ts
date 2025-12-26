/**
 * BISMAN ERP - Micro-Unlock API Utilities
 * 
 * Frontend API functions for interacting with the micro-unlock subscription system.
 * 
 * @module lib/api/micro-unlock
 */

import type {
  FeatureCatalogEntry,
  FeatureAccessResult,
  FeatureUnlock,
  FeatureUsage,
  SubscriptionPageData,
  UnlockResult,
  BillingSummary,
  Invoice,
  RevenueAnalytics,
  UsageHealthSummary,
} from '@/types/micro-unlock';

// ============================================================================
// CONFIG
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const MICRO_UNLOCK_API = `${API_BASE}/api/micro-unlock`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

async function fetchWithAuth(endpoint: string, options: FetchOptions = {}): Promise<Response> {
  const { skipAuth, ...fetchOptions } = options;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${MICRO_UNLOCK_API}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: 'include', // Include cookies for auth
  });

  return response;
}

function handleApiError(data: Record<string, unknown>, response: Response): never {
  const error = new Error((data.message as string) || 'API request failed') as Error & { 
    status: number;
    code: string;
  };
  error.status = response.status;
  error.code = (data.errorCode as string) || 'UNKNOWN_ERROR';
  throw error;
}

// ============================================================================
// FEATURE CATALOG
// ============================================================================

interface CatalogResponse {
  ok: boolean;
  features: FeatureCatalogEntry[];
  currency: string;
  defaultPrice: number;
}

/**
 * Get all available features in the catalog
 */
export async function getFeatureCatalog(): Promise<CatalogResponse> {
  const response = await fetchWithAuth('/features');
  const data = await response.json();
  
  if (!response.ok || !data.ok) {
    handleApiError(data, response);
  }
  
  return data;
}

/**
 * Get features by category
 */
export async function getFeaturesByCategory(category: string): Promise<FeatureCatalogEntry[]> {
  const response = await fetchWithAuth(`/features?category=${encodeURIComponent(category)}`);
  const data = await response.json();
  
  if (!response.ok || !data.ok) {
    handleApiError(data, response);
  }
  
  return data.features;
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

interface UsageSummaryResponse {
  ok: boolean;
  usage: FeatureUsage[];
  summary: UsageHealthSummary;
}

/**
 * Get current usage summary for tenant
 */
export async function getUsageSummary(): Promise<UsageSummaryResponse> {
  const response = await fetchWithAuth('/usage/summary');
  const data = await response.json();
  
  if (!response.ok || !data.ok) {
    handleApiError(data, response);
  }
  
  return data;
}

/**
 * Check if a specific feature can be used
 */
export async function checkFeatureAccess(featureKey: string): Promise<FeatureAccessResult> {
  const response = await fetchWithAuth('/check-access', {
    method: 'POST',
    body: JSON.stringify({ featureKey }),
  });
  const data = await response.json();
  
  if (!response.ok || !data.ok) {
    // Return the data even on failure - it contains unlock info
    if (data.errorCode === 'MICRO_UNLOCK_REQUIRED') {
      return {
        allowed: false,
        reason: 'limit_exceeded',
        current_usage: data.unlockPrompt?.currentUsage || 0,
        usage_limit: data.unlockPrompt?.usageLimit || 0,
        is_unlocked: false,
        unlock_price: data.unlockPrompt?.price || 100,
        reset_in_seconds: data.unlockPrompt?.resetInSeconds || 0,
        canUnlock: true,
      };
    }
    handleApiError(data, response);
  }
  
  return data.access;
}

/**
 * Record usage of a feature
 */
export async function recordFeatureUsage(
  featureKey: string, 
  quantity: number = 1,
  metadata?: Record<string, unknown>
): Promise<{
  ok: boolean;
  newCount: number;
  limitReached: boolean;
}> {
  const response = await fetchWithAuth('/record-usage', {
    method: 'POST',
    body: JSON.stringify({ featureKey, quantity, metadata }),
  });
  const data = await response.json();
  
  if (!response.ok || !data.ok) {
    handleApiError(data, response);
  }
  
  return data;
}

// ============================================================================
// FEATURE UNLOCKS
// ============================================================================

interface UnlockedFeaturesResponse {
  ok: boolean;
  unlocks: FeatureUnlock[];
  count: number;
  totalMonthly: number;
}

/**
 * Get all unlocked features for tenant
 */
export async function getUnlockedFeatures(): Promise<UnlockedFeaturesResponse> {
  const response = await fetchWithAuth('/unlocks');
  const data = await response.json();
  
  if (!response.ok || !data.ok) {
    handleApiError(data, response);
  }
  
  return data;
}

/**
 * Unlock a feature
 */
export async function unlockFeature(
  featureKey: string,
  options: {
    autoRenew?: boolean;
    paymentMethod?: string;
  } = {}
): Promise<UnlockResult> {
  const response = await fetchWithAuth('/unlock', {
    method: 'POST',
    body: JSON.stringify({ featureKey, ...options }),
  });
  const data = await response.json();
  
  if (!response.ok || !data.ok) {
    handleApiError(data, response);
  }
  
  return data.unlock;
}

/**
 * Cancel an unlocked feature
 */
export async function cancelUnlock(featureKey: string): Promise<{ ok: boolean; message: string }> {
  const response = await fetchWithAuth(`/unlocks/${featureKey}`, {
    method: 'DELETE',
  });
  const data = await response.json();
  
  if (!response.ok || !data.ok) {
    handleApiError(data, response);
  }
  
  return data;
}

/**
 * Toggle auto-renew for an unlock
 */
export async function toggleAutoRenew(
  featureKey: string, 
  autoRenew: boolean
): Promise<{ ok: boolean; autoRenew: boolean }> {
  const response = await fetchWithAuth(`/unlocks/${featureKey}/auto-renew`, {
    method: 'PATCH',
    body: JSON.stringify({ autoRenew }),
  });
  const data = await response.json();
  
  if (!response.ok || !data.ok) {
    handleApiError(data, response);
  }
  
  return data;
}

// ============================================================================
// SUBSCRIPTION DASHBOARD
// ============================================================================

interface DashboardResponse {
  ok: boolean;
  data: SubscriptionPageData;
}

/**
 * Get subscription dashboard data for admin
 */
export async function getSubscriptionDashboard(): Promise<SubscriptionPageData> {
  const response = await fetchWithAuth('/admin/dashboard');
  const data: DashboardResponse = await response.json();
  
  if (!response.ok || !data.ok) {
    handleApiError(data as Record<string, unknown>, response);
  }
  
  return data.data;
}

// ============================================================================
// BILLING
// ============================================================================

interface BillingSummaryResponse {
  ok: boolean;
  billing: BillingSummary;
}

/**
 * Get billing summary for tenant
 */
export async function getBillingSummary(): Promise<BillingSummary> {
  const response = await fetchWithAuth('/billing/summary');
  const data: BillingSummaryResponse = await response.json();
  
  if (!response.ok || !data.ok) {
    handleApiError(data as Record<string, unknown>, response);
  }
  
  return data.billing;
}

interface InvoicesResponse {
  ok: boolean;
  invoices: Invoice[];
  total: number;
}

/**
 * Get invoice history
 */
export async function getInvoices(
  options: { 
    page?: number; 
    limit?: number;
    status?: string;
  } = {}
): Promise<InvoicesResponse> {
  const params = new URLSearchParams();
  if (options.page) params.set('page', String(options.page));
  if (options.limit) params.set('limit', String(options.limit));
  if (options.status) params.set('status', options.status);
  
  const response = await fetchWithAuth(`/billing/invoices?${params.toString()}`);
  const data = await response.json();
  
  if (!response.ok || !data.ok) {
    handleApiError(data, response);
  }
  
  return data;
}

/**
 * Download invoice PDF
 */
export function getInvoiceDownloadUrl(invoiceId: number): string {
  return `${MICRO_UNLOCK_API}/billing/invoices/${invoiceId}/download`;
}

// ============================================================================
// SUPER ADMIN APIs
// ============================================================================

interface TenantUnlocksResponse {
  ok: boolean;
  tenants: Array<{
    tenant_id: string;
    tenant_name: string;
    unlocks: FeatureUnlock[];
    totalMonthly: number;
  }>;
}

/**
 * Get all tenant unlocks (Super Admin only)
 */
export async function getAllTenantUnlocks(): Promise<TenantUnlocksResponse> {
  const response = await fetchWithAuth('/super-admin/tenants/unlocks');
  const data = await response.json();
  
  if (!response.ok || !data.ok) {
    handleApiError(data, response);
  }
  
  return data;
}

interface RevenueResponse {
  ok: boolean;
  analytics: RevenueAnalytics;
}

/**
 * Get revenue analytics (Super Admin only)
 */
export async function getRevenueAnalytics(): Promise<RevenueAnalytics> {
  const response = await fetchWithAuth('/super-admin/analytics/revenue');
  const data: RevenueResponse = await response.json();
  
  if (!response.ok || !data.ok) {
    handleApiError(data as Record<string, unknown>, response);
  }
  
  return data.analytics;
}

/**
 * Create a new feature in the catalog (Super Admin only)
 */
export async function createFeature(
  feature: Omit<FeatureCatalogEntry, 'id'>
): Promise<FeatureCatalogEntry> {
  const response = await fetchWithAuth('/super-admin/features', {
    method: 'POST',
    body: JSON.stringify(feature),
  });
  const data = await response.json();
  
  if (!response.ok || !data.ok) {
    handleApiError(data, response);
  }
  
  return data.feature;
}

/**
 * Update a feature in the catalog (Super Admin only)
 */
export async function updateFeature(
  featureKey: string,
  updates: Partial<FeatureCatalogEntry>
): Promise<FeatureCatalogEntry> {
  const response = await fetchWithAuth(`/super-admin/features/${featureKey}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  
  if (!response.ok || !data.ok) {
    handleApiError(data, response);
  }
  
  return data.feature;
}

/**
 * Override a tenant's feature unlock (Super Admin only)
 */
export async function overrideTenantUnlock(
  tenantId: string,
  featureKey: string,
  options: {
    price?: number;
    reason: string;
  }
): Promise<FeatureUnlock> {
  const response = await fetchWithAuth('/super-admin/override-unlock', {
    method: 'POST',
    body: JSON.stringify({ tenantId, featureKey, ...options }),
  });
  const data = await response.json();
  
  if (!response.ok || !data.ok) {
    handleApiError(data, response);
  }
  
  return data.unlock;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const microUnlockApi = {
  // Catalog
  getFeatureCatalog,
  getFeaturesByCategory,
  
  // Usage
  getUsageSummary,
  checkFeatureAccess,
  recordFeatureUsage,
  
  // Unlocks
  getUnlockedFeatures,
  unlockFeature,
  cancelUnlock,
  toggleAutoRenew,
  
  // Dashboard
  getSubscriptionDashboard,
  
  // Billing
  getBillingSummary,
  getInvoices,
  getInvoiceDownloadUrl,
  
  // Super Admin
  getAllTenantUnlocks,
  getRevenueAnalytics,
  createFeature,
  updateFeature,
  overrideTenantUnlock,
};

export default microUnlockApi;
