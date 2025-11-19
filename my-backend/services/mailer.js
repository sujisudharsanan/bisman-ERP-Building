/*
 Enterprise Mailer (Bluehost SMTP) - RFC/GDPR compliant
*/
if (process.env.ENABLE_LEGACY_MAIL_OTP !== '1') {
  module.exports = {
    sendMail: async () => ({ ok: false, skipped: true, reason: 'legacy_mail_disabled' })
  }
  return;
}
const nodemailer = require('nodemailer');
const os = require('os');
const crypto = require('crypto');
const logger = require('../utils/logger');

const mask = (email) => {
  if (!email || !email.includes('@')) return '***';
  const [user, domain] = email.split('@');
  const u = user.length <= 2 ? user[0] : `${user[0]}***${user[user.length - 1]}`;
  return `${u}@${domain}`;
};

function buildTransport() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.example.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true', // true for 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
    },
    tls: { rejectUnauthorized: true },
    pool: true,
    maxConnections: Number(process.env.SMTP_MAX_CONN || 10),
    maxMessages: Number(process.env.SMTP_MAX_MSG || 200),
  });

  transporter.verify().then(()=>{
    logger.info('[mailer] SMTP transporter verified');
  }).catch((err)=>{
    logger.warn('[mailer] SMTP verify failed:', err?.code || err?.message);
  });

  return transporter;
}

const transporter = buildTransport();

function sanitizeHeaders(headers = {}) {
  return {
    'X-Mailer': 'BISMAN-ERP-Mailer',
    'X-ERP-Node': os.hostname(),
    'X-ERP-Trace': crypto.randomBytes(8).toString('hex'),
    ...headers,
  };
}

async function sendMail({ to, subject, html, text, headers = {}, dkim }) {
  if (!to || /[\r\n]/.test(subject || '')) throw new Error('Invalid mail fields');
  const from = process.env.FROM_EMAIL || `No Reply <${process.env.SMTP_USER}>`;
  const opts = {
    from,
    to,
    subject,
    html,
    text: text || (html ? html.replace(/<[^>]+>/g, '') : ''),
    headers: sanitizeHeaders(headers),
  };
  if (dkim && process.env.DKIM_DOMAIN) {
    opts.dkim = {
      domainName: process.env.DKIM_DOMAIN,
      keySelector: process.env.DKIM_SELECTOR || 'default',
      privateKey: process.env.DKIM_PRIVATE_KEY,
    };
  }
  try {
    const info = await transporter.sendMail(opts);
    logger.info(`[mailer] sent ${mask(to)} id=${info.messageId}`);
    return info;
  } catch (err) {
    const code = err?.code || err?.responseCode;
    logger.error('[mailer] send error', { code, msg: String(err?.message || err) });
    throw err;
  }
}

module.exports = { sendMail, transporter };
