/**
 * ============================================================================
 * Email Service - Password Reset Templates - BISMAN ERP
 * ============================================================================
 * Professional email templates for password reset flow
 * Supports both HTML and plain text formats
 * ============================================================================
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// ============================================================================
// Email Configuration
// ============================================================================

// Create transporter (configure with your SMTP provider)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  // For Gmail, you may need to enable "Less secure app access" or use App Passwords
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    logger.error('Email transporter configuration error:', error);
  } else {
    logger.info('Email server is ready to send messages');
  }
});

// ============================================================================
// Email Templates
// ============================================================================

/**
 * Password Reset Request Email Template
 */
function getPasswordResetEmailTemplate({ username, resetLink, expiresInMinutes }) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - BISMAN ERP</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #1e40af;
      font-size: 20px;
      margin-bottom: 20px;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .reset-button {
      display: inline-block;
      padding: 14px 40px;
      background: #1e40af;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      transition: background 0.3s;
    }
    .reset-button:hover {
      background: #1e3a8a;
    }
    .expiry-notice {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .security-notice {
      background: #dbeafe;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      background: #f9fafb;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .footer a {
      color: #1e40af;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .container {
        margin: 0;
        border-radius: 0;
      }
      .content {
        padding: 30px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 BISMAN ERP</h1>
      <p style="margin: 10px 0 0 0; font-size: 14px;">Enterprise Resource Planning System</p>
    </div>
    
    <div class="content">
      <h2>Password Reset Request</h2>
      
      <p>Hi <strong>${username}</strong>,</p>
      
      <p>We received a request to reset your BISMAN ERP password. Click the button below to set a new password:</p>
      
      <div class="button-container">
        <a href="${resetLink}" class="reset-button">Reset My Password</a>
      </div>
      
      <div class="expiry-notice">
        <strong>⏰ Time Sensitive:</strong> This link expires in <strong>${expiresInMinutes} minutes</strong>. 
        If you need more time, please request a new reset link.
      </div>
      
      <div class="security-notice">
        <strong>🛡️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. 
        Your password will remain unchanged and secure.
      </div>
      
      <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
        <strong>Having trouble?</strong> If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="font-size: 12px; color: #9ca3af; word-break: break-all;">
        ${resetLink}
      </p>
    </div>
    
    <div class="footer">
      <p>
        Need help? Contact us at 
        <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@bisman.com'}">${process.env.SUPPORT_EMAIL || 'support@bisman.com'}</a>
      </p>
      <p style="margin: 10px 0 0 0;">
        &copy; ${new Date().getFullYear()} BISMAN ERP. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
BISMAN ERP - Password Reset Request

Hi ${username},

We received a request to reset your BISMAN ERP password.

To reset your password, please visit:
${resetLink}

⏰ This link expires in ${expiresInMinutes} minutes.

🛡️ Security Notice: If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

Having trouble? Copy and paste the link above into your browser.

Need help? Contact us at ${process.env.SUPPORT_EMAIL || 'support@bisman.com'}

© ${new Date().getFullYear()} BISMAN ERP. All rights reserved.
  `;

  return { html, text };
}

/**
 * Password Change Confirmation Email Template
 */
function getPasswordChangeConfirmationTemplate({ username, changedAt, ip }) {
  const formattedDate = new Date(changedAt).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Changed - BISMAN ERP</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .success-icon {
      text-align: center;
      font-size: 48px;
      margin-bottom: 20px;
    }
    .content h2 {
      color: #059669;
      font-size: 20px;
      margin-bottom: 20px;
      text-align: center;
    }
    .info-box {
      background: #f0fdf4;
      border-left: 4px solid #10b981;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box p {
      margin: 5px 0;
      font-size: 14px;
    }
    .alert-box {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .support-button {
      display: inline-block;
      padding: 12px 30px;
      background: #1e40af;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 14px;
    }
    .footer {
      background: #f9fafb;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .footer a {
      color: #1e40af;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 BISMAN ERP</h1>
      <p style="margin: 10px 0 0 0; font-size: 14px;">Enterprise Resource Planning System</p>
    </div>
    
    <div class="content">
      <div class="success-icon">✅</div>
      <h2>Password Successfully Changed</h2>
      
      <p>Hi <strong>${username}</strong>,</p>
      
      <p>Your BISMAN ERP password was successfully changed.</p>
      
      <div class="info-box">
        <p><strong>📅 Date & Time:</strong> ${formattedDate}</p>
        <p><strong>🌐 IP Address:</strong> ${ip}</p>
      </div>
      
      <p>All your existing sessions have been logged out for security. Please log in again with your new password.</p>
      
      <div class="alert-box">
        <strong>⚠️ Didn't make this change?</strong><br>
        If you did not change your password, please contact our support team immediately. 
        Your account security may be compromised.
      </div>
      
      <div class="button-container">
        <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@bisman.com'}" class="support-button">
          Contact Support
        </a>
      </div>
    </div>
    
    <div class="footer">
      <p>
        Questions? Contact us at 
        <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@bisman.com'}">${process.env.SUPPORT_EMAIL || 'support@bisman.com'}</a>
      </p>
      <p style="margin: 10px 0 0 0;">
        &copy; ${new Date().getFullYear()} BISMAN ERP. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
BISMAN ERP - Password Successfully Changed

Hi ${username},

Your BISMAN ERP password was successfully changed.

Details:
- Date & Time: ${formattedDate}
- IP Address: ${ip}

All your existing sessions have been logged out for security. Please log in again with your new password.

⚠️ Didn't make this change?
If you did not change your password, please contact our support team immediately at ${process.env.SUPPORT_EMAIL || 'support@bisman.com'}.

© ${new Date().getFullYear()} BISMAN ERP. All rights reserved.
  `;

  return { html, text };
}

// ============================================================================
// Email Sending Functions
// ============================================================================

/**
 * Send password reset email
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.username - User's display name
 * @param {string} options.resetLink - Password reset URL
 * @param {number} options.expiresInMinutes - Token expiry time
 */
async function sendPasswordResetEmail({ to, username, resetLink, expiresInMinutes }) {
  try {
    const { html, text } = getPasswordResetEmailTemplate({
      username,
      resetLink,
      expiresInMinutes
    });

    const info = await transporter.sendMail({
      from: `"BISMAN ERP" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: 'Reset Your BISMAN ERP Password',
      text,
      html,
    });

    logger.info(`Password reset email sent to ${to}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`Failed to send password reset email to ${to}:`, error);
    throw error;
  }
}

/**
 * Send password change confirmation email
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.username - User's display name
 * @param {Date} options.changedAt - When password was changed
 * @param {string} options.ip - IP address of the change
 */
async function sendPasswordChangeConfirmationEmail({ to, username, changedAt, ip }) {
  try {
    const { html, text } = getPasswordChangeConfirmationTemplate({
      username,
      changedAt,
      ip
    });

    const info = await transporter.sendMail({
      from: `"BISMAN ERP Security" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: 'Your BISMAN ERP Password Was Changed',
      text,
      html,
    });

    logger.info(`Password change confirmation sent to ${to}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`Failed to send password change confirmation to ${to}:`, error);
    throw error;
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendPasswordChangeConfirmationEmail,
  transporter, // Export for testing
};
