/**
 * Security Scan API Routes
 * 
 * Endpoints for RBAC bypass detection and security monitoring.
 * All endpoints require ENTERPRISE_ADMIN role.
 * 
 * @module routes/security
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbacMiddleware');
const bypassDetection = require('../services/bypassDetection');

// All routes require Enterprise Admin
router.use(authenticate);
router.use(requireRole('ENTERPRISE_ADMIN'));

/**
 * GET /api/security/scan
 * Run full security scan
 */
router.get('/scan', async (req, res) => {
  try {
    const results = await bypassDetection.runFullScan();
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('[security] Scan error:', error);
    res.status(500).json({
      success: false,
      error: 'Security scan failed',
      message: error.message
    });
  }
});

/**
 * GET /api/security/routes
 * Scan for unprotected routes
 */
router.get('/routes', async (req, res) => {
  try {
    const results = await bypassDetection.scanUnprotectedRoutes();
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/security/raw-sql
 * Scan for raw SQL usage
 */
router.get('/raw-sql', async (req, res) => {
  try {
    const results = await bypassDetection.scanRawSqlUsage();
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/security/cache
 * Check permission cache status
 */
router.get('/cache', async (req, res) => {
  try {
    const results = await bypassDetection.checkStaleCacheEntries();
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/security/audit
 * Analyze audit logs for suspicious patterns
 */
router.get('/audit', async (req, res) => {
  try {
    const results = await bypassDetection.analyzeAuditLogs();
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/security/connections
 * Check database connections
 */
router.get('/connections', async (req, res) => {
  try {
    const results = await bypassDetection.checkDatabaseConnections();
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
