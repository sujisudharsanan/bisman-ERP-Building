/**
 * Deployment Service
 * API calls for Deployment Center functionality
 */

import axios from '@/lib/api/axios';
import type {
  DeploymentStatus,
  DeploymentHistory,
  DeploymentHistoryPage,
  DeploymentPipeline,
  DeploymentSettings,
  HealthCheckResult,
  DeployRequest,
  RollbackRequest,
  BackupResult,
} from '@/types/deployment';

const BASE_PATH = '/api/deployment';
const BACKUP_PATH = '/api/backup';

/**
 * Get current deployment status for a tenant
 */
export async function getDeploymentStatus(tenantId: string): Promise<DeploymentStatus> {
  const response = await axios.get<{ data: DeploymentStatus }>(`${BASE_PATH}/status`, {
    params: { tenantId },
  });
  return response.data.data || response.data;
}

/**
 * Get paginated deployment history for a tenant
 */
export async function getDeploymentHistory(
  tenantId: string,
  page: number = 1
): Promise<DeploymentHistoryPage> {
  const response = await axios.get<{ data: DeploymentHistoryPage }>(`${BASE_PATH}/history`, {
    params: { tenantId, page },
  });
  return response.data.data || response.data;
}

/**
 * Get deployment pipelines for a tenant
 */
export async function getDeploymentPipelines(tenantId: string): Promise<DeploymentPipeline[]> {
  const response = await axios.get<{ data: DeploymentPipeline[] }>(`${BASE_PATH}/pipelines`, {
    params: { tenantId },
  });
  return response.data.data || response.data || [];
}

/**
 * Trigger a new deployment
 */
export async function triggerDeployment(request: DeployRequest): Promise<{ deploymentId: string; message: string }> {
  const response = await axios.post<{ data: { deploymentId: string; message: string } }>(
    `${BASE_PATH}/deploy`,
    request
  );
  return response.data.data || response.data;
}

/**
 * Run a health check
 */
export async function runHealthCheck(tenantId: string): Promise<HealthCheckResult> {
  const response = await axios.post<{ data: HealthCheckResult }>(`${BASE_PATH}/health-check`, {
    tenantId,
  });
  return response.data.data || response.data;
}

/**
 * Rollback to a previous deployment
 */
export async function rollbackDeployment(
  request: RollbackRequest
): Promise<{ deploymentId: string; message: string }> {
  const response = await axios.post<{ data: { deploymentId: string; message: string } }>(
    `${BASE_PATH}/rollback`,
    request
  );
  return response.data.data || response.data;
}

/**
 * Get deployment settings for a tenant
 */
export async function getDeploymentSettings(tenantId: string): Promise<DeploymentSettings> {
  const response = await axios.get<{ data: DeploymentSettings }>(`${BASE_PATH}/settings`, {
    params: { tenantId },
  });
  return response.data.data || response.data;
}

/**
 * Update deployment settings for a tenant
 */
export async function updateDeploymentSettings(
  tenantId: string,
  settings: Partial<DeploymentSettings>
): Promise<DeploymentSettings> {
  const response = await axios.put<{ data: DeploymentSettings }>(`${BASE_PATH}/settings`, settings, {
    params: { tenantId },
  });
  return response.data.data || response.data;
}

/**
 * Run a backup before deployment
 */
export async function runBackup(tenantId: string): Promise<BackupResult> {
  const response = await axios.post<{ data: BackupResult }>(`${BACKUP_PATH}/run`, {
    tenantId,
  });
  return response.data.data || response.data;
}

/**
 * Get deployment detail (logs, release notes, health summary)
 */
export async function getDeploymentDetail(
  tenantId: string,
  deploymentId: string
): Promise<DeploymentHistory> {
  const response = await axios.get<{ data: DeploymentHistory }>(`${BASE_PATH}/history/${deploymentId}`, {
    params: { tenantId },
  });
  return response.data.data || response.data;
}
