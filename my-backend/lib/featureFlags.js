/**
 * BISMAN ERP - Feature Flag Service
 * 
 * Centralized feature flag management with plan-to-feature mapping
 * and runtime enforcement for both API and UI levels.
 * 
 * @module lib/featureFlags
 */

const { getPrisma } = require('./prisma');

// ============================================================================
// FEATURE FLAG DEFINITIONS
// ============================================================================

/**
 * All available feature flags in the system
 */
const FEATURE_FLAGS = {
  // Access & Roles
  CUSTOM_ROLES: 'CUSTOM_ROLES',
  MAKER_CHECKER: 'MAKER_CHECKER',
  
  // Workflow & Automation
  AUTOMATION_RULES: 'AUTOMATION_RULES',
  
  // Integrations
  API_ACCESS: 'API_ACCESS',
  
  // Compliance
  AUDIT_EXPORT: 'AUDIT_EXPORT',
  COMPLIANCE_MODULE: 'COMPLIANCE_MODULE',
  
  // Real-time
  REALTIME_SOCKET: 'REALTIME_SOCKET',
  
  // Analytics
  REPORT_BUILDER: 'REPORT_BUILDER',
  KPI_ANALYTICS: 'KPI_ANALYTICS',
  CUSTOM_DASHBOARDS: 'CUSTOM_DASHBOARDS',
  
  // Enterprise
  WHITE_LABEL: 'WHITE_LABEL',
  SSO: 'SSO',
  MULTI_ENTITY: 'MULTI_ENTITY',
  IP_RESTRICTIONS: 'IP_RESTRICTIONS',
  DEDICATED_SUPPORT: 'DEDICATED_SUPPORT',
  DEDICATED_INFRASTRUCTURE: 'DEDICATED_INFRASTRUCTURE',
  
  // Infrastructure
  DAILY_BACKUP: 'DAILY_BACKUP',
  WEEKLY_BACKUP: 'WEEKLY_BACKUP',
  HOURLY_BACKUP: 'HOURLY_BACKUP',
  
  // Notifications
  EMAIL_NOTIFICATIONS: 'EMAIL_NOTIFICATIONS',
  CHAT_NOTIFICATIONS: 'CHAT_NOTIFICATIONS',
  
  // Modules
  BASIC_FINANCE: 'BASIC_FINANCE',
  ADVANCED_FINANCE: 'ADVANCED_FINANCE',
  COST_CENTERS: 'COST_CENTERS',
  TASK_MANAGEMENT: 'TASK_MANAGEMENT',
  OPERATIONS_DASHBOARD: 'OPERATIONS_DASHBOARD',
  LEGAL_MODULE: 'LEGAL_MODULE',
};

/**
 * Default feature flags by plan
 * These are the baseline - can be overridden per-client
 */
const PLAN_FEATURE_DEFAULTS = {
  STARTER: {
    CUSTOM_ROLES: false,
    MAKER_CHECKER: false,
    AUTOMATION_RULES: false,
    API_ACCESS: false,
    AUDIT_EXPORT: false,
    REALTIME_SOCKET: false,
    REPORT_BUILDER: false,
    COMPLIANCE_MODULE: false,
    WHITE_LABEL: false,
    SSO: false,
    MULTI_ENTITY: false,
    WEEKLY_BACKUP: true,
    DAILY_BACKUP: false,
    EMAIL_NOTIFICATIONS: true,
    BASIC_FINANCE: true,
    TASK_MANAGEMENT: true,
    OPERATIONS_DASHBOARD: true,
  },
  
  PROFESSIONAL: {
    CUSTOM_ROLES: true,
    MAKER_CHECKER: true,
    AUTOMATION_RULES: 'LIMITED', // 10 rules max
    API_ACCESS: true,
    AUDIT_EXPORT: true,
    REALTIME_SOCKET: true,
    REPORT_BUILDER: false,
    COMPLIANCE_MODULE: false,
    WHITE_LABEL: false,
    SSO: false,
    MULTI_ENTITY: false,
    WEEKLY_BACKUP: true,
    DAILY_BACKUP: true,
    EMAIL_NOTIFICATIONS: true,
    CHAT_NOTIFICATIONS: true,
    ADVANCED_FINANCE: true,
    COST_CENTERS: true,
    TASK_MANAGEMENT: true,
    OPERATIONS_DASHBOARD: true,
  },
  
  BUSINESS: {
    CUSTOM_ROLES: true,
    MAKER_CHECKER: true,
    AUTOMATION_RULES: 'UNLIMITED',
    API_ACCESS: true,
    AUDIT_EXPORT: true,
    REALTIME_SOCKET: true,
    REPORT_BUILDER: true,
    COMPLIANCE_MODULE: true,
    WHITE_LABEL: false,
    SSO: false,
    MULTI_ENTITY: true,
    WEEKLY_BACKUP: true,
    DAILY_BACKUP: true,
    EMAIL_NOTIFICATIONS: true,
    CHAT_NOTIFICATIONS: true,
    ADVANCED_FINANCE: true,
    COST_CENTERS: true,
    KPI_ANALYTICS: true,
    CUSTOM_DASHBOARDS: true,
    TASK_MANAGEMENT: true,
    OPERATIONS_DASHBOARD: true,
    LEGAL_MODULE: true,
  },
  
  ENTERPRISE: {
    ALL_FEATURES: true,
    CUSTOM_ROLES: true,
    MAKER_CHECKER: true,
    AUTOMATION_RULES: 'UNLIMITED',
    API_ACCESS: true,
    AUDIT_EXPORT: true,
    REALTIME_SOCKET: true,
    REPORT_BUILDER: true,
    COMPLIANCE_MODULE: true,
    WHITE_LABEL: true,
    SSO: true,
    MULTI_ENTITY: true,
    IP_RESTRICTIONS: true,
    DEDICATED_SUPPORT: true,
    DEDICATED_INFRASTRUCTURE: true,
    WEEKLY_BACKUP: true,
    DAILY_BACKUP: true,
    HOURLY_BACKUP: true,
    EMAIL_NOTIFICATIONS: true,
    CHAT_NOTIFICATIONS: true,
    ADVANCED_FINANCE: true,
    COST_CENTERS: true,
    KPI_ANALYTICS: true,
    CUSTOM_DASHBOARDS: true,
    TASK_MANAGEMENT: true,
    OPERATIONS_DASHBOARD: true,
    LEGAL_MODULE: true,
  },
};

/**
 * Plan limits (user count, storage, API calls)
 */
const PLAN_LIMITS = {
  STARTER: {
    max_users: 5,
    max_storage_gb: 5,
    max_branches: 1,
    max_api_calls_day: 0,
    max_automation_rules: 0,
    audit_retention_months: 3,
    backup_type: 'weekly',
    support_sla_hours: 72,
  },
  
  PROFESSIONAL: {
    max_users: 25,
    max_storage_gb: 50,
    max_branches: 5,
    max_api_calls_day: 10000,
    max_automation_rules: 10,
    audit_retention_months: 12,
    backup_type: 'daily',
    support_sla_hours: 24,
  },
  
  BUSINESS: {
    max_users: 100,
    max_storage_gb: 200,
    max_branches: 20,
    max_api_calls_day: 50000,
    max_automation_rules: -1, // Unlimited
    audit_retention_months: 36,
    backup_type: 'daily',
    support_sla_hours: 8,
  },
  
  ENTERPRISE: {
    max_users: -1, // Unlimited
    max_storage_gb: -1, // Unlimited
    max_branches: -1, // Unlimited
    max_api_calls_day: -1, // Unlimited
    max_automation_rules: -1, // Unlimited
    audit_retention_months: -1, // Unlimited
    backup_type: 'hourly',
    support_sla_hours: 1,
  },
};

// ============================================================================
// FEATURE FLAG SERVICE CLASS
// ============================================================================

class FeatureFlagService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get all feature flags for a client
   * Combines plan defaults + client-specific overrides
   */
  async getClientFeatures(clientId) {
    const cacheKey = `features:${clientId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    const prisma = getPrisma();
    
    try {
      // Get client's subscription and plan
      const subscription = await prisma.client_subscriptions.findUnique({
        where: { client_id: clientId },
        include: {
          plan: true,
        },
      });

      if (!subscription) {
        // No subscription = starter defaults
        return this._cacheAndReturn(cacheKey, {
          plan: 'STARTER',
          features: PLAN_FEATURE_DEFAULTS.STARTER,
          limits: PLAN_LIMITS.STARTER,
          overrides: {},
          state: 'TRIAL',
        });
      }

      // Get plan's feature flags
      const planCode = subscription.plan.plan_code;
      const planFeatures = subscription.plan.feature_flags || PLAN_FEATURE_DEFAULTS[planCode] || {};
      const planLimits = PLAN_LIMITS[planCode] || PLAN_LIMITS.STARTER;

      // Get client-specific overrides
      const overrides = await prisma.client_feature_overrides.findMany({
        where: {
          client_id: clientId,
          OR: [
            { expires_at: null },
            { expires_at: { gt: new Date() } },
          ],
        },
      });

      // Build merged feature set
      const mergedFeatures = { ...planFeatures };
      const overrideMap = {};
      
      for (const override of overrides) {
        overrideMap[override.flag_code] = {
          value: override.override_value,
          numeric: override.numeric_override,
          reason: override.reason,
          expires_at: override.expires_at,
        };
        
        // Apply override
        if (override.override_value === 'ENABLED') {
          mergedFeatures[override.flag_code] = true;
        } else if (override.override_value === 'DISABLED') {
          mergedFeatures[override.flag_code] = false;
        } else if (override.override_value === 'LIMITED') {
          mergedFeatures[override.flag_code] = 'LIMITED';
        } else if (override.override_value === 'UNLIMITED') {
          mergedFeatures[override.flag_code] = 'UNLIMITED';
        }
      }

      // Check subscription state - restrict features if suspended/cancelled
      const restrictedStates = ['SUSPENDED', 'CANCELLED', 'GRACE_PERIOD'];
      const isRestricted = restrictedStates.includes(subscription.state);

      const result = {
        plan: planCode,
        planName: subscription.plan.name,
        features: mergedFeatures,
        limits: {
          ...planLimits,
          max_users: subscription.plan.max_users,
          max_storage_gb: subscription.plan.max_storage_gb,
          max_branches: subscription.plan.max_branches,
          max_api_calls_day: subscription.plan.max_api_calls_day,
        },
        overrides: overrideMap,
        state: subscription.state,
        isRestricted,
        usage: {
          current_users: subscription.current_user_count,
          current_storage: subscription.current_storage_used,
          current_api_calls: subscription.current_api_calls,
        },
        billing: {
          cycle: subscription.billing_cycle,
          next_billing: subscription.next_billing_date,
          period_end: subscription.current_period_end,
        },
      };

      return this._cacheAndReturn(cacheKey, result);
      
    } catch (error) {
      console.error('[FeatureFlags] Error getting client features:', error);
      // Fallback to starter
      return {
        plan: 'STARTER',
        features: PLAN_FEATURE_DEFAULTS.STARTER,
        limits: PLAN_LIMITS.STARTER,
        overrides: {},
        state: 'TRIAL',
        error: error.message,
      };
    }
  }

  /**
   * Check if a specific feature is enabled for a client
   */
  async hasFeature(clientId, featureCode) {
    const clientFeatures = await this.getClientFeatures(clientId);
    
    // Enterprise has all features
    if (clientFeatures.features.ALL_FEATURES) {
      return true;
    }

    const value = clientFeatures.features[featureCode];
    
    // Handle different value types
    if (value === true || value === 'UNLIMITED' || value === 'LIMITED') {
      return true;
    }
    
    return false;
  }

  /**
   * Check if a feature has limited access
   */
  async isFeatureLimited(clientId, featureCode) {
    const clientFeatures = await this.getClientFeatures(clientId);
    return clientFeatures.features[featureCode] === 'LIMITED';
  }

  /**
   * Get a specific limit for a client
   */
  async getLimit(clientId, limitKey) {
    const clientFeatures = await this.getClientFeatures(clientId);
    return clientFeatures.limits[limitKey];
  }

  /**
   * Check if client is within usage limits
   */
  async checkUsageLimit(clientId, limitKey, currentValue) {
    const limit = await this.getLimit(clientId, limitKey);
    
    // -1 means unlimited
    if (limit === -1) {
      return { allowed: true, limit, current: currentValue };
    }
    
    return {
      allowed: currentValue < limit,
      limit,
      current: currentValue,
      remaining: Math.max(0, limit - currentValue),
    };
  }

  /**
   * Validate if action is allowed based on subscription state
   */
  async canPerformAction(clientId, action) {
    const clientFeatures = await this.getClientFeatures(clientId);
    const state = clientFeatures.state;

    // Define allowed actions per state
    const statePermissions = {
      TRIAL: ['read', 'write', 'create', 'update', 'delete'],
      ACTIVE: ['read', 'write', 'create', 'update', 'delete'],
      UPGRADING: ['read', 'write', 'create', 'update', 'delete'],
      DOWNGRADING: ['read', 'write'], // Can't create premium content
      GRACE_PERIOD: ['read', 'write'], // Limited write
      SUSPENDED: ['read'], // Read only
      CANCELLED: [], // No access
    };

    const allowedActions = statePermissions[state] || [];
    return allowedActions.includes(action);
  }

  /**
   * Invalidate cache for a client
   */
  invalidateCache(clientId) {
    this.cache.delete(`features:${clientId}`);
  }

  /**
   * Clear entire cache
   */
  clearCache() {
    this.cache.clear();
  }

  // Private: Cache helper
  _cacheAndReturn(key, data) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.cacheExpiry,
    });
    return data;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const featureFlagService = new FeatureFlagService();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get feature flags for a client (convenience function)
 */
async function getClientFeatures(clientId) {
  return featureFlagService.getClientFeatures(clientId);
}

/**
 * Check if feature is enabled (convenience function)
 */
async function hasFeature(clientId, featureCode) {
  return featureFlagService.hasFeature(clientId, featureCode);
}

/**
 * Check usage limit (convenience function)
 */
async function checkLimit(clientId, limitKey, currentValue) {
  return featureFlagService.checkUsageLimit(clientId, limitKey, currentValue);
}

/**
 * Get all available plans with features
 */
async function getAllPlans() {
  const prisma = getPrisma();
  
  try {
    const plans = await prisma.subscription_plans.findMany({
      where: { is_active: true, is_public: true },
      orderBy: { sort_order: 'asc' },
    });
    
    return plans.map(plan => ({
      ...plan,
      limits: PLAN_LIMITS[plan.plan_code] || {},
    }));
  } catch (error) {
    console.error('[FeatureFlags] Error getting plans:', error);
    // Return hardcoded plans as fallback
    return Object.entries(PLAN_FEATURE_DEFAULTS).map(([code, features], index) => ({
      plan_code: code,
      name: code.charAt(0) + code.slice(1).toLowerCase(),
      features,
      limits: PLAN_LIMITS[code],
      sort_order: index,
    }));
  }
}

/**
 * Map API route to required feature
 */
const ROUTE_FEATURE_MAP = {
  // Custom roles
  '/api/rbac/roles/create': 'CUSTOM_ROLES',
  '/api/rbac/roles/update': 'CUSTOM_ROLES',
  '/api/rbac/roles/delete': 'CUSTOM_ROLES',
  
  // Maker-Checker
  '/api/approvals': 'MAKER_CHECKER',
  '/api/approval-flows': 'MAKER_CHECKER',
  
  // Automation
  '/api/automation': 'AUTOMATION_RULES',
  '/api/workflows/automation': 'AUTOMATION_RULES',
  
  // API Access (external)
  '/api/v1/external': 'API_ACCESS',
  '/api/integrations': 'API_ACCESS',
  
  // Audit Export
  '/api/audit/export': 'AUDIT_EXPORT',
  '/api/reports/audit': 'AUDIT_EXPORT',
  
  // Report Builder
  '/api/reports/builder': 'REPORT_BUILDER',
  '/api/reports/custom': 'REPORT_BUILDER',
  
  // Compliance
  '/api/compliance': 'COMPLIANCE_MODULE',
  '/api/legal': 'COMPLIANCE_MODULE',
  
  // SSO
  '/api/auth/sso': 'SSO',
  '/api/auth/saml': 'SSO',
  
  // Multi-entity
  '/api/entities': 'MULTI_ENTITY',
  '/api/organization/entities': 'MULTI_ENTITY',
};

/**
 * Get required feature for a route
 */
function getRequiredFeature(routePath) {
  // Check exact match first
  if (ROUTE_FEATURE_MAP[routePath]) {
    return ROUTE_FEATURE_MAP[routePath];
  }
  
  // Check prefix matches
  for (const [route, feature] of Object.entries(ROUTE_FEATURE_MAP)) {
    if (routePath.startsWith(route)) {
      return feature;
    }
  }
  
  return null; // No feature required
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Service
  featureFlagService,
  FeatureFlagService,
  
  // Constants
  FEATURE_FLAGS,
  PLAN_FEATURE_DEFAULTS,
  PLAN_LIMITS,
  ROUTE_FEATURE_MAP,
  
  // Functions
  getClientFeatures,
  hasFeature,
  checkLimit,
  getAllPlans,
  getRequiredFeature,
};
