/**
 * Deployment Types
 * TypeScript interfaces for deployment-related data
 */

export type DeploymentStatusType = 'success' | 'failed' | 'in_progress' | 'pending' | 'cancelled';
export type HealthStatus = 'ok' | 'warning' | 'failed' | 'unknown';
export type Environment = 'production' | 'staging' | 'development' | 'uat';

/**
 * Current deployment status for a tenant
 */
export interface DeploymentStatus {
  currentVersion: string;
  environment: Environment;
  lastDeploymentTime: string | null;
  lastDeploymentStatus: DeploymentStatusType | null;
  healthStatus: HealthStatus;
  buildId: string | null;
  commit: string | null;
  deployedBy: string | null;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  overall: HealthStatus;
  timestamp: string;
  services: {
    api: ServiceHealth;
    database: ServiceHealth;
    cache: ServiceHealth;
    queue: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: HealthStatus;
  latency?: number;
  message?: string;
  lastChecked: string;
}

/**
 * Single deployment history entry
 */
export interface DeploymentHistory {
  id: string;
  deployedAt: string;
  version: string;
  buildId: string;
  environment: Environment;
  initiatedBy: string;
  status: DeploymentStatusType;
  backupTaken: boolean;
  backupId?: string;
  duration?: number;
  logs?: string;
  releaseNotes?: string;
  healthCheckSummary?: HealthCheckResult;
  commit?: string;
  branch?: string;
}

/**
 * Paginated deployment history response
 */
export interface DeploymentHistoryPage {
  items: DeploymentHistory[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Deployment pipeline configuration
 */
export interface DeploymentPipeline {
  id: string;
  name: string;
  branch: string;
  environment: Environment;
  lastRunStatus: DeploymentStatusType | null;
  lastRunAt: string | null;
  isActive: boolean;
  autoTrigger: boolean;
  requireApproval: boolean;
  stages?: PipelineStage[];
}

export interface PipelineStage {
  name: string;
  status: DeploymentStatusType | null;
  duration?: number;
  startedAt?: string;
  completedAt?: string;
}

/**
 * Deployment settings for a tenant
 */
export interface DeploymentSettings {
  defaultEnvironment: Environment;
  requireBackupBeforeProduction: boolean;
  autoRunHealthCheckAfterDeployment: boolean;
  notifications: {
    emailOnSuccess: boolean;
    emailOnFailure: boolean;
    slackWebhookUrl?: string;
  };
  webhookUrl?: string;
  retentionDays: number;
  maxConcurrentDeployments: number;
  environments: Environment[];
}

/**
 * Request to trigger a new deployment
 */
export interface DeployRequest {
  tenantId: string;
  environment: Environment;
  pipelineId?: string;
  requireBackup?: boolean;
  buildId?: string;
  branch?: string;
  notes?: string;
}

/**
 * Request to rollback to a previous deployment
 */
export interface RollbackRequest {
  tenantId: string;
  deploymentId: string;
  reason?: string;
}

/**
 * Backup result
 */
export interface BackupResult {
  backupId: string;
  status: 'success' | 'failed' | 'in_progress';
  startedAt: string;
  completedAt?: string;
  size?: number;
  message?: string;
}
