/**
 * Integration Types and Interfaces
 * Defines all types for the Integrations settings page
 */

export type IntegrationCategory = 
  | 'Payment' 
  | 'Communication' 
  | 'Accounting' 
  | 'Storage' 
  | 'Automation';

export type IntegrationStatus = 
  | 'Connected' 
  | 'Not Connected' 
  | 'Action Required';

export type EnvironmentType = 'Production' | 'Sandbox';

export interface IntegrationConfig {
  keyId?: string;
  keySecret?: string;
  webhookUrl?: string;
  environment?: EnvironmentType;
  autoSync?: boolean;
  [key: string]: string | boolean | undefined;
}

export interface IntegrationTestResult {
  success: boolean;
  timestamp: Date;
  message?: string;
}

export interface Integration {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  status: IntegrationStatus;
  logoUrl?: string;
  config?: IntegrationConfig;
  lastTested?: IntegrationTestResult;
  connectedAt?: Date;
  features?: string[];
  lastSync?: Date;
  nextSync?: string;
  syncAction?: string;
  syncActionLabel?: string;
}

export interface WebhookEvent {
  id: string;
  integrationId: string;
  integrationName: string;
  eventType: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: Date;
  payload?: Record<string, unknown>;
  response?: string;
}

// Outbound Webhook Types
export type OutboundWebhookStatus = 'Active' | 'Disabled';

export interface WebhookDeliveryLog {
  id: string;
  timestamp: Date;
  httpStatus: number;
  duration: number; // in ms
  success: boolean;
  errorMessage?: string;
}

export interface OutboundWebhook {
  id: string;
  eventType: string;
  targetUrl: string;
  secretToken?: string;
  status: OutboundWebhookStatus;
  lastDelivery?: Date;
  lastResponseCode?: number;
  deliveryLogs: WebhookDeliveryLog[];
  createdAt: Date;
}

// Sync Log Types
export type SyncDirection = 'Import' | 'Export';
export type SyncStatus = 'Success' | 'Failed' | 'Partial';

export interface SyncLogDetail {
  key: string;
  value: string;
}

export interface SyncLog {
  id: string;
  integrationId: string;
  integrationName: string;
  syncType: 'inbound' | 'outbound' | 'bidirectional';
  direction: SyncDirection;
  action: string;
  status: SyncStatus;
  recordsProcessed: number;
  recordsFailed: number;
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  details?: SyncLogDetail[];
  rawData?: Record<string, unknown>;
}

// Backup Integration Types
export type BackupStatus = 'active' | 'inactive' | 'error';

export interface BackupIntegration {
  id: string;
  provider: string;
  type: 'database' | 'files' | 'reports';
  status: BackupStatus;
  description?: string;
  // S3 specific
  bucketName?: string;
  region?: string;
  // Google Drive specific
  folderId?: string;
  folderName?: string;
  // Common
  lastBackup?: Date;
  lastBackupSize?: string;
  lastBackupStatus?: 'success' | 'failed';
  nextScheduledBackup?: Date;
  schedule?: string;
  enabled?: boolean;
  totalBackups: number;
  storageUsed: string;
}

export type TabType = 
  | 'all' 
  | 'connected' 
  | 'webhooks' 
  | 'sync-logs' 
  | 'backup';

// Toast Types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}
