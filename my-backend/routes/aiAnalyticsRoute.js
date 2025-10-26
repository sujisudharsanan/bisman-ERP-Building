/**
 * AI Analytics Routes
 * 
 * Endpoints for automated analytics and reporting
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { authenticateToken } = require('../middleware/rbacAuth');
const {
  generateDailySalesInsights,
  generateInventoryInsights,
  generateDailyReport,
  saveReport,
  getRecentReports,
  predictSalesTrends
} = require('../services/aiAnalyticsEngine');

// Ensure reports directory exists
const REPORTS_DIR = path.join(__dirname, '../reports/ai');
fs.mkdir(REPORTS_DIR, { recursive: true }).catch(console.error);

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * GET /api/ai/analytics/generate-report
 * Generate a new AI analytics report
 */
router.get('/generate-report', async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userRole = req.user?.role;

    console.log('[AI Analytics] Generating report for tenant:', tenantId, 'Role:', userRole);

    // Generate comprehensive report
    const report = await generateDailyReport(tenantId);

    // Save to database
    try {
      await saveReport(report);
    } catch (saveError) {
      console.warn('[AI Analytics] Could not save report to DB:', saveError.message);
    }

    // Also save to file system
    try {
      const filename = `erp_ai_insight_${report.report_date}_${tenantId || 'all'}.json`;
      const filepath = path.join(REPORTS_DIR, filename);
      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
      console.log('[AI Analytics] Report saved to:', filepath);
    } catch (fileError) {
      console.warn('[AI Analytics] Could not save report to file:', fileError.message);
    }

    res.json({
      success: true,
      report: report
    });

  } catch (error) {
    console.error('[AI Analytics] Error generating report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai/analytics/sales-insights
 * Generate sales-specific insights
 */
router.get('/sales-insights', async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    
    const insights = await generateDailySalesInsights(tenantId);

    res.json(insights);

  } catch (error) {
    console.error('[AI Analytics] Error generating sales insights:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai/analytics/inventory-insights
 * Generate inventory-specific insights
 */
router.get('/inventory-insights', async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    
    const insights = await generateInventoryInsights(tenantId);

    res.json(insights);

  } catch (error) {
    console.error('[AI Analytics] Error generating inventory insights:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai/analytics/predict-sales
 * Predict future sales trends
 */
router.get('/predict-sales', async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const days = parseInt(req.query.days) || 7;

    if (days < 1 || days > 30) {
      return res.status(400).json({
        success: false,
        error: 'Days must be between 1 and 30'
      });
    }

    const prediction = await predictSalesTrends(tenantId, days);

    res.json(prediction);

  } catch (error) {
    console.error('[AI Analytics] Error predicting sales:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai/analytics/reports
 * Get recent AI reports
 */
router.get('/reports', async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userRole = req.user?.role;
    const limit = parseInt(req.query.limit) || 10;

    // Enterprise admin can see all reports
    const filterTenantId = userRole === 'enterprise-admin' ? null : tenantId;

    const reports = await getRecentReports(filterTenantId, limit);

    res.json({
      success: true,
      reports: reports,
      count: reports.length
    });

  } catch (error) {
    console.error('[AI Analytics] Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai/analytics/reports/:id
 * Get specific report by ID
 */
router.get('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const userRole = req.user?.role;

    const { getPrisma } = require('../lib/prisma');
    const prisma = getPrisma();

    const query = `
      SELECT *
      FROM ai_reports
      WHERE id = $1
      ${userRole !== 'enterprise-admin' && tenantId ? 'AND tenant_id = $2' : ''}
      LIMIT 1;
    `;

    const params = userRole !== 'enterprise-admin' && tenantId ? [parseInt(id), tenantId] : [parseInt(id)];
    const report = await prisma.$queryRawUnsafe(query, ...params);

    if (!report || report.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      report: report[0]
    });

  } catch (error) {
    console.error('[AI Analytics] Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/ai/analytics/reports/:id
 * Delete a report
 */
router.delete('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;

    // Only enterprise admin can delete reports
    if (userRole !== 'enterprise-admin') {
      return res.status(403).json({
        success: false,
        error: 'Only enterprise admin can delete reports'
      });
    }

    const { getPrisma } = require('../lib/prisma');
    const prisma = getPrisma();

    await prisma.$queryRawUnsafe(`
      DELETE FROM ai_reports
      WHERE id = $1
    `, parseInt(id));

    res.json({
      success: true,
      message: 'Report deleted'
    });

  } catch (error) {
    console.error('[AI Analytics] Error deleting report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ai/analytics/custom
 * Generate custom analytics report
 */
router.post('/custom', async (req, res) => {
  try {
    const { query_type, parameters } = req.body;
    const tenantId = req.user?.tenant_id;

    if (!query_type) {
      return res.status(400).json({
        success: false,
        error: 'query_type is required'
      });
    }

    let result;

    switch (query_type) {
      case 'sales':
        result = await generateDailySalesInsights(tenantId);
        break;
      case 'inventory':
        result = await generateInventoryInsights(tenantId);
        break;
      case 'prediction':
        result = await predictSalesTrends(tenantId, parameters?.days || 7);
        break;
      case 'full':
        result = await generateDailyReport(tenantId);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid query_type. Valid types: sales, inventory, prediction, full'
        });
    }

    res.json({
      success: true,
      query_type: query_type,
      result: result
    });

  } catch (error) {
    console.error('[AI Analytics] Error generating custom report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
