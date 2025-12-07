/**
 * Fallback & Recovery Service
 * API calls for incident management, system recovery, and safety controls
 */

import axios from '@/lib/api/axios';
import type {
  Incident,
  CurrentIncidentResponse,
  IncidentsListResponse,
  DeploymentSummary,
  RollbackRequest,
  RollbackResponse,
  Backup,
  BackupListResponse,
  RestoreRequest,
  RestoreResponse,
  HealthSummaryResponse,
  HealthCheckResponse,
  CrashLogsResponse,
  MaintenanceStatus,
  SetMaintenanceRequest,
  AccessRestrictions,
  OperationResult,
  PingResult,
  TenantSummary,
  Environment,
} from '@/types/fallback';

const FALLBACK_PATH = '/api/fallback';
const DEPLOYMENT_PATH = '/api/deployment';
const BACKUP_PATH = '/api/backup';
const HEALTH_PATH = '/api/health';
const LOGS_PATH = '/api/logs';
const IT_ADMIN_PATH = '/api/it-admin';

// ============================================================================
// INCIDENT MANAGEMENT
// ============================================================================

/**
 * Get the current active incident (if any)
 */
export async function getCurrentIncident(): Promise<CurrentIncidentResponse> {
  const response = await axios.get<{ data: CurrentIncidentResponse }>(
    `${FALLBACK_PATH}/current-incident`
  );
  return response.data.data || response.data;
}

/**
 * Get list of incidents with optional filters
 */
export async function getIncidents(params?: {
  tenantId?: string;
  status?: 'open' | 'recent' | 'resolved' | 'all';
  page?: number;
  pageSize?: number;
}): Promise<IncidentsListResponse> {
  const response = await axios.get<{ data: IncidentsListResponse }>(
    `${FALLBACK_PATH}/incidents`,
    { params }
  );
  return response.data.data || response.data;
}

/**
 * Get incident details by ID
 */
export async function getIncidentById(incidentId: string): Promise<Incident> {
  const response = await axios.get<{ data: Incident }>(
    `${FALLBACK_PATH}/incidents/${incidentId}`
  );
  return response.data.data || response.data;
}

// ============================================================================
// DEPLOYMENT & ROLLBACK
// ============================================================================

/**
 * Get current deployment status
 */
export async function getDeploymentStatus(): Promise<DeploymentSummary> {
  const response = await axios.get<{ data: DeploymentSummary }>(
    `${DEPLOYMENT_PATH}/status`
  );
  return response.data.data || response.data;
}

/**
 * Get deployment history with optional filters
 */
export async function getDeploymentHistory(params?: {
  status?: 'success' | 'failed' | 'all';
  limit?: number;
  page?: number;
}): Promise<{ items: DeploymentSummary[]; totalCount: number }> {
  const response = await axios.get<{ data: { items: DeploymentSummary[]; totalCount: number } }>(
    `${DEPLOYMENT_PATH}/history`,
    { params }
  );
  return response.data.data || response.data;
}

/**
 * Get last successful deployment
 */
export async function getLastSuccessfulDeployment(): Promise<DeploymentSummary | null> {
  const response = await axios.get<{ data: { items: DeploymentSummary[] } }>(
    `${DEPLOYMENT_PATH}/history`,
    { params: { status: 'success', limit: 1 } }
  );
  const data = response.data.data || response.data;
  return data.items?.[0] || null;
}

/**
 * Get failed deployments for recovery
 */
export async function getFailedDeployments(): Promise<DeploymentSummary[]> {
  const response = await axios.get<{ data: { items: DeploymentSummary[] } }>(
    `${DEPLOYMENT_PATH}/history`,
    { params: { status: 'failed', limit: 10 } }
  );
  const data = response.data.data || response.data;
  return data.items || [];
}

/**
 * Rollback to a previous deployment
 */
export async function rollbackDeployment(request: RollbackRequest): Promise<RollbackResponse> {
  const response = await axios.post<{ data: RollbackResponse }>(
    `${DEPLOYMENT_PATH}/rollback`,
    request
  );
  return response.data.data || response.data;
}

// ============================================================================
// BACKUP & RESTORE
// ============================================================================

/**
 * Get list of available backups
 */
export async function getBackups(params?: {
  tenantId?: string;
  environment?: Environment;
  type?: string;
  page?: number;
  pageSize?: number;
}): Promise<BackupListResponse> {
  const response = await axios.get<{ data: BackupListResponse }>(
    `${BACKUP_PATH}/list`,
    { params }
  );
  return response.data.data || response.data;
}

/**
 * Get backup details by ID
 */
export async function getBackupById(backupId: string): Promise<Backup> {
  const response = await axios.get<{ data: Backup }>(
    `${BACKUP_PATH}/${backupId}`
  );
  return response.data.data || response.data;
}

/**
 * Initiate a backup restore
 */
export async function restoreBackup(request: RestoreRequest): Promise<RestoreResponse> {
  const response = await axios.post<{ data: RestoreResponse }>(
    `${BACKUP_PATH}/restore`,
    request
  );
  return response.data.data || response.data;
}

// ============================================================================
// HEALTH & DIAGNOSTICS
// ============================================================================

/**
 * Get system health summary
 */
export async function getHealthSummary(): Promise<HealthSummaryResponse> {
  const response = await axios.get<{ data: HealthSummaryResponse }>(
    `${HEALTH_PATH}/summary`
  );
  return response.data.data || response.data;
}

/**
 * Run a full health check
 */
export async function runFullHealthCheck(): Promise<HealthCheckResponse> {
  const response = await axios.post<{ data: HealthCheckResponse }>(
    `${HEALTH_PATH}/check-full`
  );
  return response.data.data || response.data;
}

/**
 * Ping a specific service
 */
export async function pingService(service: 'database' | 'cache' | 'storage' | 'queue'): Promise<PingResult> {
  const response = await axios.post<{ data: PingResult }>(
    `${HEALTH_PATH}/ping/${service}`
  );
  return response.data.data || response.data;
}

/**
 * Get crash logs for an incident
 */
export async function getCrashLogs(incidentId: string): Promise<CrashLogsResponse> {
  const response = await axios.get<{ data: CrashLogsResponse }>(
    `${LOGS_PATH}/crash`,
    { params: { incidentId } }
  );
  return response.data.data || response.data;
}

// ============================================================================
// TECHNICAL RECOVERY TOOLS
// ============================================================================

/**
 * Clear application cache
 */
export async function clearCache(): Promise<OperationResult> {
  const response = await axios.post<{ data: OperationResult }>(
    `${FALLBACK_PATH}/clear-cache`
  );
  return response.data.data || response.data;
}

/**
 * Restart application services
 */
export async function restartServices(): Promise<OperationResult> {
  const response = await axios.post<{ data: OperationResult }>(
    `${FALLBACK_PATH}/restart-services`
  );
  return response.data.data || response.data;
}

// ============================================================================
// MAINTENANCE & SAFETY CONTROLS
// ============================================================================

/**
 * Get current maintenance status
 */
export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  const response = await axios.get<{ data: MaintenanceStatus }>(
    `${IT_ADMIN_PATH}/maintenance-status`
  );
  return response.data.data || response.data;
}

/**
 * Set maintenance mode
 */
export async function setMaintenanceStatus(request: SetMaintenanceRequest): Promise<OperationResult> {
  const response = await axios.post<{ data: OperationResult }>(
    `${IT_ADMIN_PATH}/maintenance-status`,
    request
  );
  return response.data.data || response.data;
}

/**
 * Get access restrictions
 */
export async function getAccessRestrictions(): Promise<AccessRestrictions> {
  const response = await axios.get<{ data: AccessRestrictions }>(
    `${FALLBACK_PATH}/access-restrictions`
  );
  return response.data.data || response.data;
}

/**
 * Update access restrictions
 */
export async function updateAccessRestrictions(
  restrictions: Partial<AccessRestrictions>
): Promise<OperationResult> {
  const response = await axios.post<{ data: OperationResult }>(
    `${FALLBACK_PATH}/access-restrictions`,
    restrictions
  );
  return response.data.data || response.data;
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Get list of tenants for selection
 */
export async function getTenants(): Promise<TenantSummary[]> {
  const response = await axios.get<{ data: TenantSummary[] }>(
    '/api/tenants/list'
  );
  return response.data.data || response.data || [];
}

/**
 * Get current environment info
 */
export async function getEnvironmentInfo(): Promise<{ environment: Environment; version: string }> {
  const response = await axios.get<{ data: { environment: Environment; version: string } }>(
    '/api/system/environment'
  );
  return response.data.data || response.data;
}
