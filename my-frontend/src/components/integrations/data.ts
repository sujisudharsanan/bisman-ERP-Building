/**
 * Integration Mock Data
 * Realistic sample data for the Integrations settings page
 */

import type { 
  Integration, 
  WebhookEvent, 
  SyncLog, 
  BackupIntegration,
  OutboundWebhook 
} from './types';

export const INTEGRATIONS_DATA: Integration[] = [
  {
    id: 'razorpay',
    name: 'Razorpay',
    category: 'Payment',
    description: 'Accept payments via cards, UPI, wallets, and net banking with India\'s leading payment gateway.',
    status: 'Connected',
    logoUrl: '/integrations/razorpay.svg',
    config: {
      keyId: 'rzp_live_8dX1Example123',
      keySecret: '••••••••••••••••',
      webhookUrl: 'https://api.bismanerp.com/webhooks/razorpay/global-plastics',
      environment: 'Production',
      autoSync: true,
    },
    lastTested: {
      success: true,
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      message: 'Connection verified successfully',
    },
    connectedAt: new Date('2024-08-15'),
    features: ['Payment collection', 'Refunds', 'Payment links', 'Subscriptions'],
    lastSync: new Date(Date.now() - 45 * 60 * 1000), // Today, 10:15 AM equivalent
    nextSync: 'Today, 10:30 AM',
    syncAction: 'sync',
    syncActionLabel: 'Sync Now',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'Payment',
    description: 'Global payment processing for international transactions with multi-currency support.',
    status: 'Not Connected',
    logoUrl: '/integrations/stripe.svg',
    features: ['Card payments', 'International payments', 'Invoicing', 'Subscriptions'],
  },
  {
    id: 'twilio-sms',
    name: 'Twilio SMS',
    category: 'Communication',
    description: 'Send transactional SMS notifications for order updates, OTPs, and alerts.',
    status: 'Connected',
    logoUrl: '/integrations/twilio.svg',
    config: {
      keyId: 'AC1234567890abcdef',
      keySecret: '••••••••••••••••',
      webhookUrl: 'https://api.bismanerp.com/webhooks/twilio/sms',
      environment: 'Production',
      autoSync: false,
    },
    lastTested: {
      success: true,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      message: 'SMS gateway operational',
    },
    connectedAt: new Date('2024-06-10'),
    features: ['SMS notifications', 'OTP delivery', 'Bulk messaging'],
    lastSync: new Date(Date.now() - 70 * 60 * 1000), // Today, 09:50 AM equivalent
    nextSync: 'Every 5 minutes',
    syncAction: 'test-sms',
    syncActionLabel: 'Send Test SMS',
  },
  {
    id: 'whatsapp-cloud',
    name: 'WhatsApp Cloud API',
    category: 'Communication',
    description: 'Send order confirmations, shipping updates, and support messages via WhatsApp.',
    status: 'Action Required',
    logoUrl: '/integrations/whatsapp.svg',
    config: {
      keyId: 'EAAG...',
      environment: 'Production',
    },
    lastTested: {
      success: false,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      message: 'Access token expired. Please re-authenticate.',
    },
    features: ['Message templates', 'Media messages', 'Customer support'],
  },
  {
    id: 'sendgrid',
    name: 'SendGrid Email',
    category: 'Communication',
    description: 'Reliable email delivery for invoices, reports, and marketing campaigns.',
    status: 'Connected',
    logoUrl: '/integrations/sendgrid.svg',
    config: {
      keyId: 'SG.xxxxxxxxxxxxxxxxxxxx',
      keySecret: '••••••••••••••••',
      webhookUrl: 'https://api.bismanerp.com/webhooks/sendgrid/events',
      environment: 'Production',
      autoSync: true,
    },
    lastTested: {
      success: true,
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      message: 'Email delivery verified',
    },
    connectedAt: new Date('2024-03-20'),
    features: ['Transactional emails', 'Email templates', 'Delivery tracking', 'Analytics'],
    lastSync: new Date(Date.now() - 13 * 60 * 60 * 1000), // Yesterday, 11:20 PM equivalent
    nextSync: 'Hourly',
    syncAction: 'test-email',
    syncActionLabel: 'Send Test Email',
  },
  {
    id: 'amazon-s3',
    name: 'Amazon S3',
    category: 'Storage',
    description: 'Cloud storage for documents, invoices, and media files with unlimited scalability.',
    status: 'Connected',
    logoUrl: '/integrations/aws-s3.svg',
    config: {
      keyId: 'AKIAIOSFODNN7EXAMPLE',
      keySecret: '••••••••••••••••',
      environment: 'Production',
      autoSync: true,
    },
    lastTested: {
      success: true,
      timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      message: 'Bucket access confirmed',
    },
    connectedAt: new Date('2024-01-05'),
    features: ['File storage', 'Document backup', 'Media hosting', 'CDN integration'],
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    category: 'Storage',
    description: 'Sync and backup business documents to Google Drive for easy access and sharing.',
    status: 'Not Connected',
    logoUrl: '/integrations/google-drive.svg',
    features: ['File sync', 'Document collaboration', 'Backup', 'Sharing'],
  },
  {
    id: 'tally',
    name: 'Tally Connector',
    category: 'Accounting',
    description: 'Two-way sync with Tally for seamless accounting and financial reporting.',
    status: 'Not Connected',
    logoUrl: '/integrations/tally.svg',
    features: ['Ledger sync', 'Invoice export', 'GST reports', 'Bank reconciliation'],
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    category: 'Accounting',
    description: 'Automatic sync of invoices, expenses, and financial data with QuickBooks.',
    status: 'Connected',
    logoUrl: '/integrations/quickbooks.svg',
    config: {
      keyId: 'QB-REALM-123456789',
      keySecret: '••••••••••••••••',
      webhookUrl: 'https://api.bismanerp.com/webhooks/quickbooks/events',
      environment: 'Production',
      autoSync: true,
    },
    lastTested: {
      success: true,
      timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      message: 'Sync completed successfully',
    },
    connectedAt: new Date('2024-05-12'),
    features: ['Invoice sync', 'Expense tracking', 'Financial reports', 'Tax calculations'],
    lastSync: new Date(new Date().setHours(18, 45, 0, 0) - 24 * 60 * 60 * 1000), // Dec 06, 2025, 06:45 PM
    nextSync: 'Daily at 02:00 AM',
    syncAction: 'full-sync',
    syncActionLabel: 'Run Full Sync',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    category: 'Automation',
    description: 'Connect BISMAN ERP to 5,000+ apps with custom automation workflows.',
    status: 'Connected',
    logoUrl: '/integrations/zapier.svg',
    config: {
      keyId: 'zap_xxxxxxxxxxxxxxxx',
      webhookUrl: 'https://hooks.zapier.com/hooks/catch/12345/abcdef/',
      environment: 'Production',
      autoSync: true,
    },
    lastTested: {
      success: true,
      timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      message: 'Trigger verified',
    },
    connectedAt: new Date('2024-07-01'),
    features: ['Custom workflows', 'App connections', 'Scheduled tasks', 'Webhooks'],
    lastSync: new Date(Date.now() - 55 * 60 * 1000), // Today, 10:05 AM equivalent
    nextSync: 'On demand',
    syncAction: 'open-zapier',
    syncActionLabel: 'Open in Zapier',
  },
];

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  {
    id: 'wh-001',
    integrationId: 'razorpay',
    integrationName: 'Razorpay',
    eventType: 'payment.captured',
    status: 'success',
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    payload: { payment_id: 'pay_O1234567890', amount: 15000, currency: 'INR' },
    response: '200 OK',
  },
  {
    id: 'wh-002',
    integrationId: 'razorpay',
    integrationName: 'Razorpay',
    eventType: 'payment.failed',
    status: 'success',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    payload: { payment_id: 'pay_O9876543210', error_code: 'BAD_REQUEST_ERROR' },
    response: '200 OK',
  },
  {
    id: 'wh-003',
    integrationId: 'sendgrid',
    integrationName: 'SendGrid Email',
    eventType: 'email.delivered',
    status: 'success',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    payload: { message_id: 'sg-msg-12345', recipient: 'customer@example.com' },
    response: '200 OK',
  },
  {
    id: 'wh-004',
    integrationId: 'zapier',
    integrationName: 'Zapier',
    eventType: 'order.created',
    status: 'failed',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    payload: { order_id: 'ORD-2024-001234' },
    response: '500 Internal Server Error',
  },
  {
    id: 'wh-005',
    integrationId: 'quickbooks',
    integrationName: 'QuickBooks Online',
    eventType: 'invoice.sync',
    status: 'success',
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    payload: { invoice_id: 'INV-2024-5678', amount: 45000 },
    response: '200 OK',
  },
];

export const SYNC_LOGS: SyncLog[] = [
  {
    id: 'sync-001',
    integrationId: 'razorpay',
    integrationName: 'Razorpay',
    syncType: 'inbound',
    direction: 'Import',
    action: 'Imported 12 new payments',
    status: 'Success',
    recordsProcessed: 12,
    recordsFailed: 0,
    startedAt: new Date(Date.now() - 45 * 60 * 1000), // Today, 10:15 AM
    completedAt: new Date(Date.now() - 44 * 60 * 1000),
    details: [
      { key: 'Total Amount', value: '₹1,24,500.00' },
      { key: 'Payment Methods', value: 'UPI (8), Card (3), Netbanking (1)' },
      { key: 'New Customers', value: '3' },
    ],
  },
  {
    id: 'sync-002',
    integrationId: 'twilio-sms',
    integrationName: 'Twilio SMS',
    syncType: 'outbound',
    direction: 'Export',
    action: 'Updated 3 sender IDs',
    status: 'Success',
    recordsProcessed: 3,
    recordsFailed: 0,
    startedAt: new Date(Date.now() - 70 * 60 * 1000), // Today, 09:50 AM
    completedAt: new Date(Date.now() - 69 * 60 * 1000),
    details: [
      { key: 'Sender IDs', value: 'BISMAN, BISMNR, GLOBAL' },
      { key: 'Status', value: 'All active' },
    ],
  },
  {
    id: 'sync-003',
    integrationId: 'quickbooks',
    integrationName: 'QuickBooks Online',
    syncType: 'outbound',
    direction: 'Export',
    action: 'Pushed 45 invoices',
    status: 'Failed',
    recordsProcessed: 38,
    recordsFailed: 7,
    startedAt: new Date(Date.now() - 90 * 60 * 1000), // Today, 09:30 AM
    completedAt: new Date(Date.now() - 88 * 60 * 1000),
    errorMessage: 'QuickBooks API rate limit exceeded. 7 invoices failed to sync.',
    details: [
      { key: 'Successful', value: '38 invoices' },
      { key: 'Failed', value: '7 invoices' },
      { key: 'Error Code', value: 'RATE_LIMIT_EXCEEDED' },
    ],
    rawData: {
      error: 'RATE_LIMIT_EXCEEDED',
      failedInvoices: ['INV-2024-1234', 'INV-2024-1235', 'INV-2024-1236', 'INV-2024-1237', 'INV-2024-1238', 'INV-2024-1239', 'INV-2024-1240'],
      retryAfter: 3600,
    },
  },
  {
    id: 'sync-004',
    integrationId: 'zapier',
    integrationName: 'Zapier',
    syncType: 'outbound',
    direction: 'Export',
    action: 'Sent lead data to CRM',
    status: 'Success',
    recordsProcessed: 15,
    recordsFailed: 0,
    startedAt: new Date(new Date().setHours(20, 10, 0, 0) - 24 * 60 * 60 * 1000), // Dec 06, 2025, 08:10 PM
    completedAt: new Date(new Date().setHours(20, 11, 0, 0) - 24 * 60 * 60 * 1000),
    details: [
      { key: 'Leads Sent', value: '15' },
      { key: 'Target App', value: 'HubSpot CRM' },
      { key: 'Zap Name', value: 'New Lead to HubSpot' },
    ],
  },
  {
    id: 'sync-005',
    integrationId: 'sendgrid',
    integrationName: 'SendGrid Email',
    syncType: 'outbound',
    direction: 'Export',
    action: 'Synced email templates',
    status: 'Partial',
    recordsProcessed: 8,
    recordsFailed: 2,
    startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000 + 2 * 60 * 1000),
    errorMessage: '2 templates had invalid HTML and were skipped.',
    details: [
      { key: 'Templates Synced', value: '8' },
      { key: 'Templates Skipped', value: '2 (invalid HTML)' },
    ],
  },
];

export const OUTBOUND_WEBHOOKS: OutboundWebhook[] = [
  {
    id: 'owh-001',
    eventType: 'Invoice Created',
    targetUrl: 'https://hooks.mycompany.com/invoice',
    secretToken: 'whsec_xxxxxxxxxxxxxxxx',
    status: 'Active',
    lastDelivery: new Date(Date.now() - 58 * 60 * 1000), // Today, 10:02 AM
    lastResponseCode: 200,
    createdAt: new Date('2024-06-15'),
    deliveryLogs: [
      { id: 'dl-001', timestamp: new Date(Date.now() - 58 * 60 * 1000), httpStatus: 200, duration: 245, success: true },
      { id: 'dl-002', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), httpStatus: 200, duration: 312, success: true },
      { id: 'dl-003', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), httpStatus: 200, duration: 198, success: true },
      { id: 'dl-004', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), httpStatus: 200, duration: 267, success: true },
      { id: 'dl-005', timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), httpStatus: 200, duration: 234, success: true },
    ],
  },
  {
    id: 'owh-002',
    eventType: 'Payment Received',
    targetUrl: 'https://api.partner.com/payment-hook',
    secretToken: 'whsec_yyyyyyyyyyyyyyyy',
    status: 'Active',
    lastDelivery: new Date(Date.now() - 62 * 60 * 1000), // Today, 09:58 AM
    lastResponseCode: 500,
    createdAt: new Date('2024-07-20'),
    deliveryLogs: [
      { id: 'dl-006', timestamp: new Date(Date.now() - 62 * 60 * 1000), httpStatus: 500, duration: 1523, success: false, errorMessage: 'Internal Server Error' },
      { id: 'dl-007', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), httpStatus: 200, duration: 456, success: true },
      { id: 'dl-008', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), httpStatus: 200, duration: 387, success: true },
      { id: 'dl-009', timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000), httpStatus: 502, duration: 5000, success: false, errorMessage: 'Bad Gateway' },
      { id: 'dl-010', timestamp: new Date(Date.now() - 9 * 60 * 60 * 1000), httpStatus: 200, duration: 412, success: true },
    ],
  },
  {
    id: 'owh-003',
    eventType: 'User Logged In',
    targetUrl: 'https://audit.mycompany.com/user-login',
    secretToken: 'whsec_zzzzzzzzzzzzzzzz',
    status: 'Disabled',
    lastDelivery: new Date(new Date().setHours(23, 30, 0, 0) - 2 * 24 * 60 * 60 * 1000), // Dec 05, 2025, 11:30 PM
    lastResponseCode: 200,
    createdAt: new Date('2024-04-10'),
    deliveryLogs: [
      { id: 'dl-011', timestamp: new Date(new Date().setHours(23, 30, 0, 0) - 2 * 24 * 60 * 60 * 1000), httpStatus: 200, duration: 178, success: true },
      { id: 'dl-012', timestamp: new Date(new Date().setHours(22, 15, 0, 0) - 2 * 24 * 60 * 60 * 1000), httpStatus: 200, duration: 165, success: true },
      { id: 'dl-013', timestamp: new Date(new Date().setHours(21, 45, 0, 0) - 2 * 24 * 60 * 60 * 1000), httpStatus: 200, duration: 189, success: true },
    ],
  },
  {
    id: 'owh-004',
    eventType: 'Order Shipped',
    targetUrl: 'https://logistics.partner.io/shipment-notify',
    secretToken: 'whsec_aaaaaaaaaaaaaaa',
    status: 'Active',
    lastDelivery: new Date(Date.now() - 30 * 60 * 1000),
    lastResponseCode: 200,
    createdAt: new Date('2024-09-01'),
    deliveryLogs: [
      { id: 'dl-014', timestamp: new Date(Date.now() - 30 * 60 * 1000), httpStatus: 200, duration: 324, success: true },
      { id: 'dl-015', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), httpStatus: 200, duration: 298, success: true },
    ],
  },
];

export const BACKUP_INTEGRATIONS: BackupIntegration[] = [
  {
    id: 'backup-s3',
    provider: 'Amazon S3',
    type: 'database',
    status: 'active',
    description: 'Nightly Database Backup',
    bucketName: 'bisman-backups-prod',
    region: 'ap-south-1',
    lastBackup: new Date(new Date().setHours(2, 0, 0, 0)), // Today, 02:00 AM
    lastBackupSize: '2.1 GB',
    lastBackupStatus: 'success',
    nextScheduledBackup: new Date(new Date().setHours(2, 0, 0, 0) + 24 * 60 * 60 * 1000), // Tomorrow, 02:00 AM
    schedule: 'Daily at 02:00 AM',
    enabled: true,
    totalBackups: 124,
    storageUsed: '48.6 GB',
  },
  {
    id: 'backup-gdrive',
    provider: 'Google Drive',
    type: 'reports',
    status: 'inactive',
    description: 'Upload monthly PDF reports to a shared Google Drive folder.',
    totalBackups: 0,
    storageUsed: '0 GB',
    enabled: false,
  },
];

export const CATEGORY_COLORS: Record<string, string> = {
  Payment: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Communication: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Accounting: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Storage: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  Automation: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
};

export const STATUS_COLORS: Record<string, string> = {
  Connected: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Not Connected': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  'Action Required': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export const TENANTS = [
  { id: 'global-plastics', name: 'Global Plastics Pvt Ltd' },
  { id: 'sunrise-foods', name: 'Sunrise Foods India' },
  { id: 'metro-logistics', name: 'Metro Logistics Corp' },
  { id: 'techno-parts', name: 'Techno Parts Manufacturing' },
];
