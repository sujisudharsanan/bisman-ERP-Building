/**
 * SuperAdmin Dashboard Types
 * Type definitions for all dashboard data structures
 */

// ============================================================================
// Core Types
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';
export type Environment = 'production' | 'staging' | 'uat' | 'development';
export type TimeRange = 'today' | '7days' | '14days' | '30days';

// ============================================================================
// KPI Card Types
// ============================================================================

export interface KPIData {
  value: number | string;
  label: string;
  subtext?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'flat';
    period: string;
  };
  status?: HealthStatus;
}

// ============================================================================
// Tenant Types
// ============================================================================

export interface TenantStats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  newThisMonth: number;
}

export interface TenantTrendPoint {
  date: string;
  newTenants: number;
  totalActive: number;
}

// ============================================================================
// Billing Types
// ============================================================================

export interface BillingStats {
  mrr: number;
  revenueThisMonth: number;
  churnRate: number;
  activeSubscriptions: number;
  overdueInvoices: number;
}

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
}

// ============================================================================
// System Health Types
// ============================================================================

export interface HealthSummary {
  overall: HealthStatus;
  uptime: number;
  components: ComponentHealth[];
}

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  latency?: number;
  lastCheck: string;
  message?: string;
}

// ============================================================================
// Deployment Types
// ============================================================================

export interface DeploymentStats {
  deploymentsToday: number;
  failedDeployments: number;
  currentVersion: string;
  lastDeployTime: string;
  pipelineStatus: 'idle' | 'running' | 'success' | 'failed';
}

export interface DeploymentTrendPoint {
  date: string;
  successful: number;
  failed: number;
}

// ============================================================================
// Incident Types
// ============================================================================

export interface IncidentStats {
  open: number;
  inProgress: number;
  resolved24h: number;
  criticalOpen: number;
}

// ============================================================================
// Security Types
// ============================================================================

export interface SecurityStats {
  twoFactorAdoptionRate: number;
  activeSessions: number;
  failedLogins24h: number;
  openAlerts: number;
  passwordViolations: number;
}

export interface FailedLoginTrendPoint {
  hour: string;
  count: number;
}

// ============================================================================
// AI Usage Types
// ============================================================================

export interface AIUsageStats {
  requestsToday: number;
  tokensUsed: number;
  costThisMonth: number;
  activeFeatures: number;
  errors24h: number;
}

export interface AIUsageTrendPoint {
  date: string;
  requests: number;
  tokens: number;
}

// ============================================================================
// Audit Types
// ============================================================================

export interface AuditStats {
  logsToday: number;
  criticalEvents: number;
  securityEvents: number;
  userActivityEvents: number;
}

export interface AuditEvent {
  id: number;
  action: string;
  user: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  details?: string;
}

// ============================================================================
// Backup Types
// ============================================================================

export interface BackupStats {
  totalBackups: number;
  lastBackupTime: string;
  backupSizeGB: number;
  failedBackups: number;
  scheduledBackups: number;
}

// ============================================================================
// Integration Types
// ============================================================================

export interface IntegrationStats {
  activeIntegrations: number;
  failedWebhooks24h: number;
  apiCallsToday: number;
  pendingSync: number;
}

// ============================================================================
// Risk & Reliability Types
// ============================================================================

export interface RiskStats {
  failedBackups: number;
  failedWebhooks: number;
  pendingRecoveryActions: number;
  maintenanceMode: boolean;
}

// ============================================================================
// Dashboard State
// ============================================================================

export interface DashboardState {
  timeRange: TimeRange;
  loading: boolean;
  error: string | null;
  lastRefresh: string | null;
}

// ============================================================================
// API Response Wrappers
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}
