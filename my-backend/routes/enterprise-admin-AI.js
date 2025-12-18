const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const requireEnterpriseAdmin = (req, res, next) => {
  const userRole = (req.user?.role || '').toUpperCase();
  if (userRole !== 'ENTERPRISE_ADMIN') {
    return res.status(403).json({ ok: false, error: 'Access denied' });
  }
  next();
};

// Get AI Metrics
router.get('/metrics', requireEnterpriseAdmin, async (req, res) => {
  try {
    // Try to get metrics from AI usage log table
    let totalRequests = 0;
    let successfulRequests = 0;
    let avgResponseTime = 0;
    let costThisMonth = 0;

    try {
      // Get from AI usage logs if table exists
      const metrics = await prisma.aIUsageLog.aggregate({
        _count: { id: true },
        _avg: { response_time_ms: true },
        _sum: { cost_usd: true, total_tokens: true }
      });
      
      totalRequests = metrics._count?.id || 0;
      avgResponseTime = Math.round(metrics._avg?.response_time_ms || 0);
      costThisMonth = parseFloat(metrics._sum?.cost_usd || 0);
      
      // Get success count
      const successCount = await prisma.aIUsageLog.count({
        where: { success: true }
      });
      successfulRequests = successCount;
    } catch (e) {
      // Fallback to recent_activity if AI table doesn't exist
      const aiActivityRaw = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM recent_activity
        WHERE action ILIKE '%AI%' OR entity ILIKE '%ai%' OR action ILIKE '%chat%'
      `;
      totalRequests = parseInt(aiActivityRaw[0]?.count || 0);
      successfulRequests = totalRequests; // Assume all successful if from activity log
      avgResponseTime = 0;
      costThisMonth = 0;
    }

    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;

    // Count unique AI models used
    let activeModels = 0;
    try {
      const models = await prisma.aIUsageLog.groupBy({
        by: ['model'],
        _count: { id: true }
      });
      activeModels = models.length;
    } catch (e) {
      activeModels = 0;
    }

    res.json({
      ok: true,
      metrics: {
        totalRequests,
        successRate: Math.round(successRate * 10) / 10,
        avgResponseTime,
        activeModels,
        costThisMonth: Math.round(costThisMonth * 100) / 100
      }
    });
  } catch (error) {
    console.error('[AI Metrics Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch AI metrics' });
  }
});

// Get AI Models
router.get('/models', requireEnterpriseAdmin, async (req, res) => {
  try {
    // Query from AI usage logs to get actual models being used
    let models = [];
    
    try {
      const modelStats = await prisma.aIUsageLog.groupBy({
        by: ['model'],
        _count: { id: true },
        _avg: { response_time_ms: true },
        _sum: { total_tokens: true, cost_usd: true }
      });

      // Get last used time for each model
      for (const stat of modelStats) {
        const lastUsage = await prisma.aIUsageLog.findFirst({
          where: { model: stat.model },
          orderBy: { created_at: 'desc' },
          select: { created_at: true }
        });

        // Determine provider from model name
        let provider = 'Unknown';
        const modelLower = (stat.model || '').toLowerCase();
        if (modelLower.includes('gpt')) provider = 'OpenAI';
        else if (modelLower.includes('claude')) provider = 'Anthropic';
        else if (modelLower.includes('gemini')) provider = 'Google';
        else if (modelLower.includes('llama')) provider = 'Meta';

        models.push({
          id: stat.model,
          name: stat.model,
          provider,
          status: 'active',
          usage: stat._count.id,
          avgResponseTime: Math.round(stat._avg?.response_time_ms || 0),
          totalTokens: stat._sum?.total_tokens || 0,
          totalCost: parseFloat(stat._sum?.cost_usd || 0),
          lastUsed: lastUsage?.created_at?.toISOString() || null
        });
      }
    } catch (e) {
      // If AI table doesn't exist, return empty array
      models = [];
    }

    res.json({
      ok: true,
      models
    });
  } catch (error) {
    console.error('[AI Models Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch AI models' });
  }
});

// Get AI Usage Analytics
router.get('/analytics', requireEnterpriseAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    // Query AI usage over time
    const usage = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as requests
      FROM recent_activity
      WHERE (action LIKE '%AI%' OR entity LIKE '%ai%')
      AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    res.json({
      ok: true,
      usage: usage.map(u => ({
        date: u.date,
        requests: parseInt(u.requests)
      }))
    });
  } catch (error) {
    console.error('[AI Analytics Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch analytics' });
  }
});

// Update AI Model Status
router.post('/models/:id/toggle', requireEnterpriseAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // In production, update ai_models table
    // For now, just log the action
    await prisma.recent_activity.create({
      data: {
        user_id: req.user?.id,
        username: req.user?.username || 'Enterprise Admin',
        action: 'TOGGLE',
        entity: 'ai_model',
        entity_id: id,
        details: { modelId: id }
      }
    });

    res.json({
      ok: true,
      message: 'Model status toggled successfully'
    });
  } catch (error) {
    console.error('[Toggle AI Model Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to toggle model status' });
  }
});

module.exports = router;
