/**
 * Fallback & Recovery Types
 * TypeScript interfaces for incident management, recovery, and system safety
 */

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'investigating' | 'identified' | 'mitigated' | 'monitoring' | 'resolved';
export type Environment = 'production' | 'staging' | 'development' | 'uat';
export type HealthStatus = 'ok' | 'degraded' | 'down' | 'unknown';
export type BackupType = 'full' | 'incremental' | 'database' | 'files' | 'config';
export type BackupStatus = 'available' | 'in_progress' | 'failed' | 'expired';
export type RestoreStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/**
 * Timeline event for incident status changes
 */
export interface IncidentTimelineEvent {
  id: string;
  timestamp: string;
  status: IncidentStatus;
  message: string;
  updatedBy?: string;
}

/**
 * Incident record
 */
export interface Incident {
  id: string;
  startedAt: string;
  resolvedAt?: string;
  affectedEnvironment: Environment;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  rootCauseSummary?: string;
  relatedDeploymentId?: string;
  relatedBackupId?: string;
  affectedTenants?: string[];
  timeline?: IncidentTimelineEvent[];
  remediationSteps?: string[];
  notes?: string;
}

/**
 * Current incident response
 */
export interface CurrentIncidentResponse {
  hasActiveIncident: boolean;
  incident?: Incident;
}

/**
 * Incidents list response
 */
export interface IncidentsListResponse {
  incidents: Incident[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Deployment summary for recovery context
 */
export interface DeploymentSummary {
  id: string;
  version: string;
  buildId: string;
  deployedAt: string;
  environment: Environment;
  status: 'success' | 'failed' | 'in_progress' | 'pending' | 'cancelled';
  initiatedBy?: string;
  releaseNotes?: string;
  commit?: string;
  branch?: string;
}

/**
 * Rollback request
 */
export interface RollbackRequest {
  deploymentId: string;
  reason?: string;
  notifyUsers?: boolean;
}

/**
 * Rollback response
 */
export interface RollbackResponse {
  success: boolean;
  deploymentId: string;
  message: string;
  estimatedDuration?: number;
}

/**
 * Backup record
 */
export interface Backup {
  id: string;
  createdAt: string;
  createdBy?: string;
  type: BackupType;
  environment: Environment;
  tenantId?: string;
  tenantName?: string;
  size?: number;
  sizeFormatted?: string;
  status: BackupStatus;
  integrityChecked?: boolean;
  integrityStatus?: 'valid' | 'invalid' | 'unchecked';
  linkedDeploymentId?: string;
  linkedIncidentId?: string;
  expiresAt?: string;
  storageLocation?: string;
  notes?: string;
}

/**
 * Backup list response
 */
export interface BackupListResponse {
  backups: Backup[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Restore request
 */
export interface RestoreRequest {
  backupId: string;
  targetEnvironment: Environment;
  restartServicesAfter?: boolean;
  notifyUsers?: boolean;
  dryRun?: boolean;
}

/**
 * Restore response
 */
export interface RestoreResponse {
  success: boolean;
  restoreJobId: string;
  message: string;
  estimatedDuration?: number;
  status: RestoreStatus;
}

/**
 * Service health status
 */
export interface ServiceHealthStatus {
  name: string;
  displayName: string;
  status: HealthStatus;
  latency?: number;
  lastChecked: string;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Health summary response
 */
export interface HealthSummaryResponse {
  overall: HealthStatus;
  timestamp: string;
  services: ServiceHealthStatus[];
}

/**
 * Full health check response
 */
export interface HealthCheckResponse {
  success: boolean;
  overall: HealthStatus;
  timestamp: string;
  duration: number;
  services: ServiceHealthStatus[];
  warnings?: string[];
  errors?: string[];
}

/**
 * Crash log entry
 */
export interface CrashLogEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'fatal' | 'warn';
  message: string;
  stack?: string;
  service?: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Crash logs response
 */
export interface CrashLogsResponse {
  logs: CrashLogEntry[];
  totalCount: number;
  incidentId: string;
}

/**
 * Maintenance mode scope
 */
export type MaintenanceScope = 'all' | 'selected_tenants';

/**
 * Maintenance status
 */
export interface MaintenanceStatus {
  enabled: boolean;
  scope: MaintenanceScope;
  message: string;
  enabledAt?: string;
  enabledBy?: string;
  expectedEndTime?: string;
  affectedTenantIds?: string[];
}

/**
 * Set maintenance request
 */
export interface SetMaintenanceRequest {
  enabled: boolean;
  scope?: MaintenanceScope;
  message?: string;
  expectedEndTime?: string;
  affectedTenantIds?: string[];
}

/**
 * Access restrictions
 */
export interface AccessRestrictions {
  restrictNewLoginsToAdmins: boolean;
  blockNewDeployments: boolean;
  readOnlyMode?: boolean;
  lastUpdatedAt?: string;
  lastUpdatedBy?: string;
}

/**
 * Generic operation result
 */
export interface OperationResult {
  success: boolean;
  message: string;
  timestamp?: string;
  details?: Record<string, unknown>;
}

/**
 * Quick ping result
 */
export interface PingResult {
  service: string;
  status: HealthStatus;
  latency: number;
  message?: string;
}

/**
 * Tenant for selection purposes
 */
export interface TenantSummary {
  id: string;
  name: string;
  environment?: Environment;
  status?: 'active' | 'suspended' | 'inactive';
}
