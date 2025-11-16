const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { sendOTP, verifyOTP } = require('../services/otpService');
const { sendNotification } = require('../services/notificationService');
const { loginSuccessTemplate, loginFailedTemplate, notificationTemplate } = require('../services/emailTemplates');
const auth = require('../middleware/auth');

const limiterTight = rateLimit({ windowMs: 60 * 1000, max: 2, standardHeaders: true, legacyHeaders: false });
const limiterEmail = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

router.post('/send-otp', limiterTight, limiterEmail, async (req, res) => {
  try {
    const { email, purpose } = req.body || {};
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    const ua = req.get('user-agent');
    if (!email) return res.status(400).json({ error: 'email required' });
    const result = await sendOTP({ email, purpose, ip, ua });
    res.json({ ok: true, expires_at: result.expires_at });
  } catch (e) {
    res.status(429).json({ ok: false, error: e.message });
  }
});

router.post('/verify-otp', limiterTight, async (req, res) => {
  try {
    const { email, otp, purpose } = req.body || {};
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    const ua = req.get('user-agent');
    if (!email || !otp) return res.status(400).json({ error: 'email and otp required' });
    const result = await verifyOTP({ email, otp, purpose, ip, ua });
    const status = result.success ? 200 : 400;
    res.status(status).json({ ok: result.success, error: result.error });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.post('/send-notification', auth.authenticate, async (req, res) => {
  try {
    const { to, subject, html, tags } = req.body || {};
    const tpl = notificationTemplate({ title: subject, html });
    await sendNotification(to, subject, tpl.html, tags);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.post('/login-success', auth.authenticate, async (req, res) => {
  try {
    const { to, ip, ua, location } = req.body || {};
    const when = new Date().toISOString();
    const tpl = loginSuccessTemplate({ when, ip, ua, location });
    await sendNotification(to, 'Login Alert', tpl.html, ['login','success']);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.post('/login-failed', async (req, res) => {
  try {
    const { to, ip, ua, location } = req.body || {};
    const when = new Date().toISOString();
    const tpl = loginFailedTemplate({ when, ip, ua, location });
    await sendNotification(to, 'Security Warning: Failed Login', tpl.html, ['login','failed']);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

module.exports = router;
