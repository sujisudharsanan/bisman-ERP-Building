/**
 * Weekly Audit Report Job
 * 
 * Runs every Sunday at midnight to generate per-tenant
 * audit reports containing:
 * - Login events (success/failure)
 * - Role changes
 * - Billing changes
 * - Data exports
 */

const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { sendWeeklyAuditReport } = require('../alerts/alertService');

// ============================================================================
// Get Tenant Admin Email
// ============================================================================
async function getTenantAdminEmail(tenantId) {
  const admin = await prisma.user.findFirst({
    where: {
      tenant_id: tenantId,
      role: 'admin',
      is_active: true
    },
    select: { email: true }
  });
  return admin?.email;
}

// ============================================================================
// Generate Audit Report for a Tenant
// ============================================================================
async function generateAuditReport(tenantId, startDate, endDate) {
  // Get events from the events table
  const events = await prisma.$queryRaw`
    SELECT 
      id,
      event_type,
      user_id,
      payload,
      created_at
    FROM events
    WHERE client_id = ${tenantId}::uuid
      AND created_at >= ${startDate}
      AND created_at < ${endDate}
      AND event_type IN (
        'user_login', 
        'user_logout', 
        'login_failed',
        'role_change',
        'permission_change',
        'billing_change',
        'subscription_changed',
        'export_data',
        'import_data',
        'user_created',
        'user_deleted',
        'password_change',
        'mfa_enabled',
        'mfa_disabled'
      )
    ORDER BY created_at ASC
  `;

  // Get audit logs as fallback/supplement
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      tenant_id: tenantId,
      created_at: {
        gte: startDate,
        lt: endDate
      },
      action: {
        in: ['LOGIN', 'LOGOUT', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 
             'UPDATE_ROLE', 'EXPORT', 'IMPORT', 'BILLING_UPDATE']
      }
    },
    orderBy: { created_at: 'asc' }
  });

  // Combine and deduplicate
  const allEvents = [
    ...events.map(e => ({
      timestamp: e.created_at,
      type: e.event_type,
      userId: e.user_id,
      details: JSON.stringify(e.payload),
      source: 'events'
    })),
    ...auditLogs.map(log => ({
      timestamp: log.created_at,
      type: log.action,
      userId: log.user_id,
      details: JSON.stringify({ entity: log.entity_type, entityId: log.entity_id, changes: log.changes }),
      source: 'audit_log'
    }))
  ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return allEvents;
}

// ============================================================================
// Generate CSV from Events
// ============================================================================
function generateCSV(events, tenantName, weekOf) {
  const headers = ['Timestamp', 'Event Type', 'User ID', 'Details', 'Source'];
  const rows = events.map(e => [
    new Date(e.timestamp).toISOString(),
    e.type,
    e.userId || 'N/A',
    e.details.replace(/"/g, '""'), // Escape quotes for CSV
    e.source
  ]);

  const csvContent = [
    `# Audit Report for ${tenantName}`,
    `# Week of: ${weekOf}`,
    `# Generated: ${new Date().toISOString()}`,
    `# Total Events: ${events.length}`,
    '',
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return Buffer.from(csvContent, 'utf-8');
}

// ============================================================================
// Calculate Statistics
// ============================================================================
function calculateStats(events) {
  const stats = {
    totalApiCalls: 0,
    activeUsers: new Set(),
    loginEvents: 0,
    roleChanges: 0,
    dataExports: 0,
    errors: 0
  };

  for (const event of events) {
    if (event.userId) {
      stats.activeUsers.add(event.userId);
    }

    switch (event.type) {
      case 'user_login':
      case 'LOGIN':
        stats.loginEvents++;
        break;
      case 'role_change':
      case 'permission_change':
      case 'UPDATE_ROLE':
        stats.roleChanges++;
        break;
      case 'export_data':
      case 'EXPORT':
        stats.dataExports++;
        break;
      case 'login_failed':
      case 'error_occurred':
        stats.errors++;
        break;
    }
  }

  return {
    ...stats,
    activeUsers: stats.activeUsers.size
  };
}

// ============================================================================
// Run Weekly Audit for All Tenants
// ============================================================================
async function runWeeklyAudit() {
  console.log('[WeeklyAuditJob] Starting weekly audit report generation...');

  // Calculate date range (last 7 days)
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);

  const weekOf = startDate.toISOString().split('T')[0];

  try {
    // Get all active tenants
    const tenants = await prisma.client.findMany({
      where: {
        is_active: true,
        status: 'Active'
      },
      select: {
        id: true,
        name: true,
        subscriptionPlan: true
      }
    });

    let successCount = 0;
    let errorCount = 0;

    for (const tenant of tenants) {
      try {
        // Get admin email
        const adminEmail = await getTenantAdminEmail(tenant.id);
        if (!adminEmail) {
          console.log(`[WeeklyAuditJob] No admin email for tenant ${tenant.id}, skipping`);
          continue;
        }

        // Generate report
        const events = await generateAuditReport(tenant.id, startDate, endDate);
        
        // Skip if no events
        if (events.length === 0) {
          console.log(`[WeeklyAuditJob] No events for tenant ${tenant.id}, skipping`);
          continue;
        }

        // Calculate stats
        const stats = calculateStats(events);

        // Generate CSV
        const csvBuffer = generateCSV(events, tenant.name, weekOf);

        // Send email with report
        await sendWeeklyAuditReport(
          tenant.id,
          tenant.name,
          weekOf,
          stats,
          csvBuffer,
          adminEmail
        );

        successCount++;
        console.log(`[WeeklyAuditJob] Sent report for ${tenant.name} (${events.length} events)`);
      } catch (error) {
        errorCount++;
        console.error(`[WeeklyAuditJob] Error processing tenant ${tenant.id}:`, error);
      }
    }

    console.log(`[WeeklyAuditJob] Completed. Success: ${successCount}, Errors: ${errorCount}`);
  } catch (error) {
    console.error('[WeeklyAuditJob] Failed to run weekly audit:', error);
  }
}

// ============================================================================
// Start Scheduled Job
// ============================================================================
function startWeeklyAuditJob() {
  // Run every Sunday at midnight
  const schedule = process.env.WEEKLY_AUDIT_CRON || '0 0 * * 0';

  cron.schedule(schedule, async () => {
    console.log('[WeeklyAuditJob] Running scheduled weekly audit...');
    await runWeeklyAudit();
  });

  console.log(`[WeeklyAuditJob] Scheduled with cron: ${schedule}`);
}

// ============================================================================
// Manual trigger for testing
// ============================================================================
async function runManualAudit(tenantId) {
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);

  const tenant = await prisma.client.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true }
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const events = await generateAuditReport(tenantId, startDate, endDate);
  const stats = calculateStats(events);
  const weekOf = startDate.toISOString().split('T')[0];
  const csvBuffer = generateCSV(events, tenant.name, weekOf);

  return {
    tenantId,
    tenantName: tenant.name,
    weekOf,
    eventCount: events.length,
    stats,
    csv: csvBuffer.toString('utf-8')
  };
}

module.exports = {
  startWeeklyAuditJob,
  runWeeklyAudit,
  runManualAudit,
  generateAuditReport,
  generateCSV
};
