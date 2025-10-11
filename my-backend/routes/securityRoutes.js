// Security Monitoring API Routes
const express = require('express');
const router = express.Router();
const security = require('../services/securityService');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');

// Ingest event
router.post('/v1/security/events', auth.authenticate, rbac.requireRole(['Super Admin', 'Admin']), async (req, res) => {
  try {
    const event = await security.ingestEvent({ ...req.body, actor_id: req.user?.id });
    res.json({ success: true, data: event });
  } catch (e) {
    res.status(400).json({ success: false, error: { message: e.message } });
  }
});

// List events
router.get('/v1/security/events', auth.authenticate, rbac.requireRole(['Super Admin', 'Admin']), async (req, res) => {
  try {
    const events = await security.listEvents(req.query);
    res.json({ success: true, data: events });
  } catch (e) {
    res.status(400).json({ success: false, error: { message: e.message } });
  }
});

// Metrics
router.get('/v1/security/metrics', auth.authenticate, rbac.requireRole(['Super Admin', 'Admin']), async (req, res) => {
  try {
    const data = await security.metrics();
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, error: { message: e.message } });
  }
});

// Add resolution
router.post('/v1/security/events/:id/resolutions', auth.authenticate, rbac.requireRole(['Super Admin', 'Admin']), async (req, res) => {
  try {
    const result = await security.addResolution(req.params.id, req.body.note, req.body.status_after || 'investigating', req.user?.id, req.body.attachments);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(400).json({ success: false, error: { message: e.message } });
  }
});

// Close event
router.post('/v1/security/events/:id/close', auth.authenticate, rbac.requireRole(['Super Admin', 'Admin']), async (req, res) => {
  try {
    const result = await security.closeEvent(req.params.id, req.user?.id);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(400).json({ success: false, error: { message: e.message } });
  }
});

// Audit
router.get('/v1/audit', auth.authenticate, rbac.requireRole(['Super Admin', 'Admin']), async (req, res) => {
  try {
    const rows = await security.getAudit({ limit: parseInt(req.query.limit || '100') });
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(400).json({ success: false, error: { message: e.message } });
  }
});

module.exports = router;
