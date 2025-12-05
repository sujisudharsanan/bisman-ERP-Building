/**
 * Alert Service
 * 
 * Sends notifications for:
 * - Quota threshold exceeded (>80%)
 * - SLA violations
 * - Payment issues
 * - Trial expiring
 */

const nodemailer = require('nodemailer');

// ============================================================================
// Email Transport Configuration
// ============================================================================
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.ALERT_SMTP_HOST || process.env.SMTP_HOST,
    port: parseInt(process.env.ALERT_SMTP_PORT || process.env.SMTP_PORT || '587'),
    secure: process.env.ALERT_SMTP_SECURE === 'true',
    auth: {
      user: process.env.ALERT_SMTP_USER || process.env.SMTP_USER,
      pass: process.env.ALERT_SMTP_PASS || process.env.SMTP_PASS
    }
  });

  return transporter;
}

// ============================================================================
// Alert Types
// ============================================================================
const ALERT_TYPES = {
  QUOTA_WARNING: 'quota_warning',
  QUOTA_EXCEEDED: 'quota_exceeded',
  SLA_VIOLATION: 'sla_violation',
  PAYMENT_FAILED: 'payment_failed',
  TRIAL_EXPIRING: 'trial_expiring',
  ERROR_BUDGET_LOW: 'error_budget_low'
};

// ============================================================================
// Email Templates
// ============================================================================
const templates = {
  quota_warning: (data) => ({
    subject: `⚠️ Quota Warning: ${data.tenantName} at ${data.percentage}%`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">⚠️ Quota Warning</h2>
        <p>The tenant <strong>${data.tenantName}</strong> has reached <strong>${data.percentage}%</strong> of their ${data.quotaType} quota.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Metric</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Current</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Limit</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Usage</th>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${data.quotaType}</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${data.current}</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${data.limit}</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; color: ${data.percentage >= 90 ? '#dc2626' : '#f59e0b'};">${data.percentage}%</td>
          </tr>
        </table>

        <p>Consider upgrading the plan to avoid service interruptions.</p>
        
        <p style="color: #6b7280; font-size: 12px;">
          Tenant ID: ${data.tenantId}<br>
          Plan: ${data.plan}<br>
          Time: ${new Date().toISOString()}
        </p>
      </div>
    `,
    text: `Quota Warning: ${data.tenantName} at ${data.percentage}% of ${data.quotaType} quota. Current: ${data.current}, Limit: ${data.limit}`
  }),

  sla_violation: (data) => ({
    subject: `🚨 SLA Violation: ${data.tenantName} - ${data.metric}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">🚨 SLA Violation Alert</h2>
        <p>The tenant <strong>${data.tenantName}</strong> has violated their SLA for <strong>${data.metric}</strong>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #fef2f2;">
            <th style="padding: 12px; text-align: left; border: 1px solid #fecaca;">Metric</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #fecaca;">Current</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #fecaca;">Target</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #fecaca;">Status</th>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #fecaca;">${data.metric}</td>
            <td style="padding: 12px; border: 1px solid #fecaca; color: #dc2626;">${data.current}${data.unit}</td>
            <td style="padding: 12px; border: 1px solid #fecaca;">${data.target}${data.unit}</td>
            <td style="padding: 12px; border: 1px solid #fecaca; color: #dc2626;">❌ Violated</td>
          </tr>
        </table>

        <p><strong>Action Required:</strong> Investigate the root cause and take corrective action.</p>
        
        <p style="color: #6b7280; font-size: 12px;">
          Tenant ID: ${data.tenantId}<br>
          SLA Tier: ${data.tier}<br>
          Time: ${new Date().toISOString()}
        </p>
      </div>
    `,
    text: `SLA Violation: ${data.tenantName} - ${data.metric} is ${data.current}${data.unit} (target: ${data.target}${data.unit})`
  }),

  payment_failed: (data) => ({
    subject: `❌ Payment Failed: ${data.tenantName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">❌ Payment Failed</h2>
        <p>Payment for tenant <strong>${data.tenantName}</strong> has failed.</p>
        
        <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> $${data.amount} ${data.currency}</p>
          <p><strong>Reason:</strong> ${data.reason || 'Unknown'}</p>
          <p><strong>Attempt:</strong> ${data.attemptNumber || 1}</p>
        </div>

        <p>The tenant's service may be affected if payment is not resolved.</p>
        
        <p style="color: #6b7280; font-size: 12px;">
          Tenant ID: ${data.tenantId}<br>
          Invoice ID: ${data.invoiceId}<br>
          Time: ${new Date().toISOString()}
        </p>
      </div>
    `,
    text: `Payment Failed: ${data.tenantName} - $${data.amount} ${data.currency}. Reason: ${data.reason}`
  }),

  trial_expiring: (data) => ({
    subject: `⏰ Trial Expiring: ${data.tenantName} - ${data.daysRemaining} days left`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">⏰ Trial Expiring Soon</h2>
        <p>The trial for <strong>${data.tenantName}</strong> will expire in <strong>${data.daysRemaining} days</strong>.</p>
        
        <div style="background: #fffbeb; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Trial Ends:</strong> ${data.trialEndsAt}</p>
          <p><strong>Current Plan:</strong> Trial</p>
          <p><strong>Usage This Month:</strong> ${data.apiCalls || 0} API calls</p>
        </div>

        <p>Contact the tenant to discuss upgrade options.</p>
        
        <p style="color: #6b7280; font-size: 12px;">
          Tenant ID: ${data.tenantId}<br>
          Admin Email: ${data.adminEmail}<br>
          Time: ${new Date().toISOString()}
        </p>
      </div>
    `,
    text: `Trial Expiring: ${data.tenantName} - ${data.daysRemaining} days left. Ends: ${data.trialEndsAt}`
  }),

  error_budget_low: (data) => ({
    subject: `📉 Error Budget Low: ${data.tenantName} - ${data.percentRemaining}% remaining`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">📉 Error Budget Running Low</h2>
        <p>The error budget for <strong>${data.tenantName}</strong> is running low with only <strong>${data.percentRemaining}%</strong> remaining.</p>
        
        <div style="background: #fffbeb; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Remaining:</strong> ${data.remaining} minutes</p>
          <p><strong>Total Budget:</strong> ${data.total} minutes</p>
          <p><strong>Availability:</strong> ${data.availability}%</p>
        </div>

        <p>Consider reducing deployments or investigating reliability issues.</p>
        
        <p style="color: #6b7280; font-size: 12px;">
          Tenant ID: ${data.tenantId}<br>
          SLA Tier: ${data.tier}<br>
          Time: ${new Date().toISOString()}
        </p>
      </div>
    `,
    text: `Error Budget Low: ${data.tenantName} - ${data.percentRemaining}% remaining (${data.remaining} minutes)`
  }),

  weekly_audit: (data) => ({
    subject: `📊 Weekly Audit Report: ${data.tenantName} - ${data.weekOf}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">📊 Weekly Audit Report</h2>
        <p>Weekly audit report for <strong>${data.tenantName}</strong> for the week of ${data.weekOf}.</p>
        
        <h3 style="color: #1f2937;">Summary</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;">Total API Calls</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${data.totalApiCalls}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">Active Users</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${data.activeUsers}</td>
          </tr>
          <tr style="background: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;">Login Events</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${data.loginEvents}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">Role Changes</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${data.roleChanges}</td>
          </tr>
          <tr style="background: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;">Data Exports</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${data.dataExports}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">Errors</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${data.errors}</td>
          </tr>
        </table>

        <p>Full CSV report is attached.</p>
        
        <p style="color: #6b7280; font-size: 12px;">
          Tenant ID: ${data.tenantId}<br>
          Generated: ${new Date().toISOString()}
        </p>
      </div>
    `,
    text: `Weekly Audit Report: ${data.tenantName} - ${data.weekOf}. API Calls: ${data.totalApiCalls}, Active Users: ${data.activeUsers}`
  })
};

// ============================================================================
// Send Alert Function
// ============================================================================
async function sendAlert(alertType, data, recipients) {
  const template = templates[alertType];
  if (!template) {
    console.error(`[AlertService] Unknown alert type: ${alertType}`);
    return { success: false, error: 'Unknown alert type' };
  }

  const emailContent = template(data);
  const fromEmail = process.env.ALERT_FROM_EMAIL || process.env.FROM_EMAIL || 'alerts@localhost';

  // Add ops team to recipients
  const opsEmail = process.env.OPS_ALERT_EMAIL;
  const allRecipients = [...new Set([...recipients, opsEmail].filter(Boolean))];

  if (allRecipients.length === 0) {
    console.warn('[AlertService] No recipients for alert');
    return { success: false, error: 'No recipients' };
  }

  try {
    const transport = getTransporter();
    
    const result = await transport.sendMail({
      from: fromEmail,
      to: allRecipients.join(', '),
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
      attachments: data.attachments || []
    });

    console.log(`[AlertService] Alert sent: ${alertType} to ${allRecipients.join(', ')}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[AlertService] Failed to send alert:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Specific Alert Functions
// ============================================================================
async function sendQuotaWarning(tenantId, tenantName, quotaType, current, limit, percentage, adminEmail) {
  return sendAlert(ALERT_TYPES.QUOTA_WARNING, {
    tenantId,
    tenantName,
    quotaType,
    current,
    limit,
    percentage,
    plan: 'unknown' // Would be fetched from tenant
  }, [adminEmail]);
}

async function sendSLAViolation(tenantId, tenantName, metric, current, target, unit, tier, adminEmail) {
  return sendAlert(ALERT_TYPES.SLA_VIOLATION, {
    tenantId,
    tenantName,
    metric,
    current,
    target,
    unit,
    tier
  }, [adminEmail]);
}

async function sendPaymentFailed(tenantId, tenantName, amount, currency, reason, invoiceId, adminEmail) {
  return sendAlert(ALERT_TYPES.PAYMENT_FAILED, {
    tenantId,
    tenantName,
    amount,
    currency,
    reason,
    invoiceId
  }, [adminEmail]);
}

async function sendTrialExpiring(tenantId, tenantName, daysRemaining, trialEndsAt, apiCalls, adminEmail) {
  return sendAlert(ALERT_TYPES.TRIAL_EXPIRING, {
    tenantId,
    tenantName,
    daysRemaining,
    trialEndsAt,
    apiCalls,
    adminEmail
  }, [adminEmail]);
}

async function sendErrorBudgetLow(tenantId, tenantName, percentRemaining, remaining, total, availability, tier, adminEmail) {
  return sendAlert(ALERT_TYPES.ERROR_BUDGET_LOW, {
    tenantId,
    tenantName,
    percentRemaining,
    remaining,
    total,
    availability,
    tier
  }, [adminEmail]);
}

async function sendWeeklyAuditReport(tenantId, tenantName, weekOf, stats, csvBuffer, adminEmail) {
  return sendAlert('weekly_audit', {
    tenantId,
    tenantName,
    weekOf,
    ...stats,
    attachments: [{
      filename: `audit-report-${tenantId}-${weekOf}.csv`,
      content: csvBuffer,
      contentType: 'text/csv'
    }]
  }, [adminEmail]);
}

module.exports = {
  ALERT_TYPES,
  sendAlert,
  sendQuotaWarning,
  sendSLAViolation,
  sendPaymentFailed,
  sendTrialExpiring,
  sendErrorBudgetLow,
  sendWeeklyAuditReport
};
