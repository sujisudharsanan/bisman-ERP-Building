// Reusable email templates (HTML + text) with standardized footer
const YEAR = new Date().getFullYear();
const COMPANY = process.env.COMPANY_NAME || 'BISMAN ERP';
const SUPPORT = process.env.SUPPORT_EMAIL || 'support@bisman.com';
const DOMAIN = process.env.COMPANY_DOMAIN || 'bisman.com';

function footerHTML() {
  return `
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
  <p style="font:12px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial;color:#6b7280">
    ${COMPANY} • ${DOMAIN}<br/>
    This email may contain confidential information. If you are not the intended recipient, delete it immediately.
    <br/>GDPR notice: We process personal data according to our privacy policy.
    <br/>To manage notifications, visit your email preferences in the app.
  </p>`;
}
function wrapperHTML(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="color-scheme" content="light dark"><style>
  @media (prefers-color-scheme: dark){ body{background:#0b0f19;color:#e5e7eb} a{color:#93c5fd}}
  </style></head><body style="margin:0;padding:24px;font:14px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial">
  <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:8px;overflow:hidden">
    <div style="background:#1e40af;color:#fff;padding:16px 20px;font-weight:600">${COMPANY}</div>
    <div style="padding:20px">
      <h2 style="margin:0 0 12px 0;color:#111827">${title}</h2>
      ${body}
      ${footerHTML()}
    </div>
  </div>
  </body></html>`;
}

// OTP
function otpTemplate({ email, otp, purpose, ip, ua, ts }) {
  const body = `
    <p>Your ${purpose || 'verification'} code is:</p>
    <p style="font-size:28px;letter-spacing:6px;font-weight:700">${otp}</p>
    <p>This code expires in ${process.env.OTP_EXPIRE_MIN || 5} minutes. Do not share it with anyone.</p>
    <p style="color:#6b7280">Request time: ${ts}<br/>IP: ${ip || 'N/A'}<br/>Device: ${ua || 'N/A'}</p>
  `;
  const text = `Your ${purpose || 'verification'} code is ${otp}. Expires in ${process.env.OTP_EXPIRE_MIN || 5} minutes. Request time ${ts}.`;
  return { html: wrapperHTML('Your One-Time Passcode', body), text };
}

function loginSuccessTemplate({ when, ip, ua, location }) {
  const body = `<p>New login to your account.</p><ul>
    <li>Time: ${when}</li>
    <li>IP: ${ip || 'N/A'}</li>
    <li>Device: ${ua || 'N/A'}</li>
    <li>Location: ${location || 'N/A'}</li>
  </ul>`;
  const text = `Login success. Time: ${when} IP: ${ip} Device: ${ua}`;
  return { html: wrapperHTML('Login Alert', body), text };
}

function loginFailedTemplate({ when, ip, ua, location }) {
  const body = `<p>Failed login attempt detected.</p><ul>
    <li>Time: ${when}</li>
    <li>IP: ${ip || 'N/A'}</li>
    <li>Device: ${ua || 'N/A'}</li>
    <li>Location: ${location || 'N/A'}</li>
  </ul>
  <p>If this wasn’t you, secure your account immediately.</p>`;
  const text = `Login failed. Time: ${when} IP: ${ip} Device: ${ua}`;
  return { html: wrapperHTML('Security Warning: Failed Login', body), text };
}

function notificationTemplate({ title, html, text }) {
  return { html: wrapperHTML(title || 'Notification', html || '<p>Event update</p>'), text: text || 'Notification' };
}

module.exports = { otpTemplate, loginSuccessTemplate, loginFailedTemplate, notificationTemplate };
