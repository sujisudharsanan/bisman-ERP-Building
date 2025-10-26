/**
 * AI Analytics Engine
 * 
 * Automated analytics and insights generation for ERP data.
 * Generates daily/weekly reports, predictions, and trend analysis.
 */

const { getPrisma } = require('../lib/prisma');
const { generateERPInsights } = require('./aiService');

const prisma = getPrisma();

/**
 * Generate daily sales insights
 * @param {number} tenantId - Optional tenant ID for filtering
 * @returns {Promise<object>} Insights report
 */
async function generateDailySalesInsights(tenantId = null) {
  try {
    console.log('[aiAnalytics] Generating daily sales insights...');

    // Query last 7 days of sales data
    // Note: Adjust table/column names based on your actual schema
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM sales
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      ${tenantId ? `AND tenant_id = ${tenantId}` : ''}
      GROUP BY DATE(created_at)
      ORDER BY date ASC;
    `;

    // Execute query (using raw SQL for flexibility)
    // If using Prisma models, replace with: prisma.sales.findMany(...)
    const salesData = await prisma.$queryRawUnsafe(query);

    if (!salesData || salesData.length === 0) {
      return {
        success: false,
        message: 'No sales data available for analysis',
        insights: null
      };
    }

    // Prepare context for AI
    const context = {
      period: 'Last 7 days',
      data: salesData,
      summary: {
        totalTransactions: salesData.reduce((sum, day) => sum + Number(day.transaction_count), 0),
        totalRevenue: salesData.reduce((sum, day) => sum + Number(day.total_amount), 0),
        avgDailyRevenue: salesData.reduce((sum, day) => sum + Number(day.total_amount), 0) / salesData.length
      }
    };

    // Generate AI insights
    const insights = await generateERPInsights(context, 'sales');

    return {
      success: true,
      report_type: 'daily_sales',
      report_date: new Date().toISOString().split('T')[0],
      tenant_id: tenantId,
      data: context,
      insights: insights,
      generated_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('[aiAnalytics] Error generating sales insights:', error);
    throw error;
  }
}

/**
 * Generate inventory insights
 * @param {number} tenantId - Optional tenant ID
 * @returns {Promise<object>} Insights report
 */
async function generateInventoryInsights(tenantId = null) {
  try {
    console.log('[aiAnalytics] Generating inventory insights...');

    // Query current inventory levels
    const query = `
      SELECT 
        product_name,
        current_stock,
        reorder_level,
        unit_price,
        last_updated
      FROM inventory
      WHERE 1=1
      ${tenantId ? `AND tenant_id = ${tenantId}` : ''}
      ORDER BY current_stock ASC
      LIMIT 50;
    `;

    const inventoryData = await prisma.$queryRawUnsafe(query);

    if (!inventoryData || inventoryData.length === 0) {
      return {
        success: false,
        message: 'No inventory data available',
        insights: null
      };
    }

    // Identify low stock items
    const lowStockItems = inventoryData.filter(
      item => Number(item.current_stock) <= Number(item.reorder_level)
    );

    const context = {
      period: 'Current',
      total_items: inventoryData.length,
      low_stock_count: lowStockItems.length,
      low_stock_items: lowStockItems,
      sample_data: inventoryData.slice(0, 10)
    };

    const insights = await generateERPInsights(context, 'inventory');

    return {
      success: true,
      report_type: 'inventory',
      report_date: new Date().toISOString().split('T')[0],
      tenant_id: tenantId,
      data: context,
      insights: insights,
      generated_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('[aiAnalytics] Error generating inventory insights:', error);
    throw error;
  }
}

/**
 * Generate comprehensive daily report
 * @param {number} tenantId - Optional tenant ID
 * @returns {Promise<object>} Complete daily report
 */
async function generateDailyReport(tenantId = null) {
  try {
    console.log('[aiAnalytics] Generating comprehensive daily report...');

    const reports = await Promise.allSettled([
      generateDailySalesInsights(tenantId),
      generateInventoryInsights(tenantId)
    ]);

    const salesReport = reports[0].status === 'fulfilled' ? reports[0].value : null;
    const inventoryReport = reports[1].status === 'fulfilled' ? reports[1].value : null;

    // Generate executive summary
    const executiveSummary = await generateERPInsights({
      sales: salesReport?.insights || 'No sales data',
      inventory: inventoryReport?.insights || 'No inventory data'
    }, 'executive_summary');

    return {
      success: true,
      report_date: new Date().toISOString().split('T')[0],
      tenant_id: tenantId,
      executive_summary: executiveSummary,
      sales_report: salesReport,
      inventory_report: inventoryReport,
      generated_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('[aiAnalytics] Error generating daily report:', error);
    throw error;
  }
}

/**
 * Save AI report to database
 * @param {object} report - Report data
 * @returns {Promise<object>} Saved report
 */
async function saveReport(report) {
  try {
    const saved = await prisma.$queryRawUnsafe(`
      INSERT INTO ai_reports (tenant_id, report_date, report_type, report_content, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
    `, 
      report.tenant_id || null,
      report.report_date,
      report.report_type || 'daily',
      JSON.stringify(report)
    );

    console.log('[aiAnalytics] Report saved to database');
    return saved[0];
  } catch (error) {
    console.error('[aiAnalytics] Error saving report:', error);
    throw error;
  }
}

/**
 * Get recent reports
 * @param {number} tenantId - Optional tenant ID
 * @param {number} limit - Number of reports to fetch
 * @returns {Promise<Array>} Reports
 */
async function getRecentReports(tenantId = null, limit = 10) {
  try {
    const query = `
      SELECT *
      FROM ai_reports
      WHERE 1=1
      ${tenantId ? `AND tenant_id = ${tenantId}` : ''}
      ORDER BY created_at DESC
      LIMIT ${limit};
    `;

    const reports = await prisma.$queryRawUnsafe(query);
    return reports;
  } catch (error) {
    console.error('[aiAnalytics] Error fetching reports:', error);
    throw error;
  }
}

/**
 * Predict sales trends
 * @param {number} tenantId - Optional tenant ID
 * @param {number} days - Number of days to predict
 * @returns {Promise<object>} Prediction report
 */
async function predictSalesTrends(tenantId = null, days = 7) {
  try {
    console.log(`[aiAnalytics] Predicting sales trends for next ${days} days...`);

    // Get historical data (last 30 days)
    const query = `
      SELECT 
        DATE(created_at) as date,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM sales
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      ${tenantId ? `AND tenant_id = ${tenantId}` : ''}
      GROUP BY DATE(created_at)
      ORDER BY date ASC;
    `;

    const historicalData = await prisma.$queryRawUnsafe(query);

    if (!historicalData || historicalData.length < 7) {
      return {
        success: false,
        message: 'Insufficient data for prediction (need at least 7 days)',
        prediction: null
      };
    }

    const context = {
      historical_period: 'Last 30 days',
      prediction_period: `Next ${days} days`,
      data: historicalData
    };

    const prediction = await generateERPInsights(context, 'sales_prediction');

    return {
      success: true,
      report_type: 'sales_prediction',
      report_date: new Date().toISOString().split('T')[0],
      tenant_id: tenantId,
      prediction_days: days,
      historical_data: historicalData,
      prediction: prediction,
      generated_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('[aiAnalytics] Error predicting sales trends:', error);
    throw error;
  }
}

module.exports = {
  generateDailySalesInsights,
  generateInventoryInsights,
  generateDailyReport,
  saveReport,
  getRecentReports,
  predictSalesTrends
};
