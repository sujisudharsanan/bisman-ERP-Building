// High-level notification sender with sanitization and fallback text
const { sendMail } = require('./mailer');

function stripHtml(html = '') { return html.replace(/<[^>]+>/g, ' '); }

async function sendNotification(to, subject, html, tags = []) {
  if (!to || !subject) throw new Error('to and subject required');
  if (/[\r\n]/.test(subject)) throw new Error('Invalid subject');
  const text = stripHtml(html || '');
  const headers = { 'X-ERP-Tags': tags.slice(0,8).join(',') };
  return sendMail({ to, subject, html, text, headers });
}

module.exports = { sendNotification };
