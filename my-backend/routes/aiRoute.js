/**
 * AI Query Routes
 * 
 * Endpoints for interacting with the local AI assistant
 */

const express = require('express');
const router = express.Router();
const { getPrisma } = require('../lib/prisma');
const { askLocalAI, generateSQLQuery, summarizeText, healthCheck } = require('../services/aiService');
const { authenticateToken } = require('../middleware/rbacAuth');

const prisma = getPrisma();

// Apply authentication middleware to all routes except health check
router.get('/health', async (req, res) => {
  try {
    const status = await healthCheck();
    
    res.json({
      success: status.status === 'healthy',
      ...status
    });

  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'error',
      error: error.message
    });
  }
});

// All other routes require authentication
router.use(authenticateToken);

/**
 * POST /api/ai/query
 * Ask the AI assistant a question
 */
router.post('/query', async (req, res) => {
  try {
    const { prompt, model, temperature, maxTokens } = req.body;
    const userId = req.user?.id;
    const tenantId = req.user?.tenant_id;
    const userRole = req.user?.role;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    console.log('[AI Query] User:', userId, 'Role:', userRole, 'Prompt:', prompt.substring(0, 50) + '...');

    // Query AI
    const response = await askLocalAI(prompt, {
      model,
      temperature,
      maxTokens
    });

    // Save conversation to database
    try {
      await prisma.$queryRawUnsafe(`
        INSERT INTO ai_conversations (user_id, tenant_id, role, message, response, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, userId || null, tenantId || null, userRole || 'unknown', prompt, response);
    } catch (dbError) {
      console.error('[AI Query] Warning: Could not save conversation:', dbError.message);
      // Continue even if saving fails
    }

    res.json({
      success: true,
      response: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AI Query] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: error.message.includes('ECONNREFUSED') ? 
        'Please ensure the AI service is configured and running. See documentation for setup instructions.' : 
        undefined
    });
  }
});

/**
 * POST /api/ai/query-data
 * Ask questions about ERP data (natural language to SQL)
 */
router.post('/query-data', async (req, res) => {
  try {
    const { question } = req.body;
    const userId = req.user?.id;
    const tenantId = req.user?.tenant_id;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }

    console.log('[AI Data Query]:', question);

    // Get schema information (simplified - expand based on your needs)
    const schemaInfo = `
      Tables:
      - sales (id, user_id, tenant_id, amount, created_at)
      - inventory (id, product_name, current_stock, reorder_level, tenant_id)
      - users (id, username, email, role, tenant_id)
    `;

    // Generate SQL query
    const sqlQuery = await generateSQLQuery(question, schemaInfo);

    // For security, validate query before execution
    // Only allow SELECT queries
    if (!sqlQuery.trim().toUpperCase().startsWith('SELECT')) {
      return res.status(403).json({
        success: false,
        error: 'Only SELECT queries are allowed for security reasons',
        generated_query: sqlQuery
      });
    }

    // Execute query (with tenant filtering if applicable)
    let finalQuery = sqlQuery;
    if (tenantId && sqlQuery.toLowerCase().includes('tenant_id')) {
      // Add tenant filter if not present
      if (!sqlQuery.toLowerCase().includes(`tenant_id = ${tenantId}`)) {
        finalQuery = sqlQuery.replace(/;?\s*$/, ` AND tenant_id = ${tenantId};`);
      }
    }

    try {
      const results = await prisma.$queryRawUnsafe(finalQuery);

      res.json({
        success: true,
        question: question,
        sql_query: finalQuery,
        results: results,
        row_count: results.length
      });

    } catch (queryError) {
      console.error('[AI Data Query] SQL execution error:', queryError);
      res.status(400).json({
        success: false,
        error: 'Query execution failed',
        generated_query: sqlQuery,
        details: queryError.message
      });
    }

  } catch (error) {
    console.error('[AI Data Query] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ai/summarize
 * Summarize long text or reports
 */
router.post('/summarize', async (req, res) => {
  try {
    const { text, maxLength } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    const summary = await summarizeText(text, maxLength);

    res.json({
      success: true,
      original_length: text.length,
      summary: summary,
      compression_ratio: (text.length / summary.length).toFixed(2)
    });

  } catch (error) {
    console.error('[AI Summarize] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai/conversations
 * Get conversation history
 */
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenant_id;
    const limit = parseInt(req.query.limit) || 50;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const query = `
      SELECT 
        id, 
        message, 
        response, 
        created_at
      FROM ai_conversations
      WHERE user_id = $1
      ${tenantId ? 'AND tenant_id = $2' : ''}
      ORDER BY created_at DESC
      LIMIT $${tenantId ? 3 : 2};
    `;

    const params = tenantId ? [userId, tenantId, limit] : [userId, limit];
    const conversations = await prisma.$queryRawUnsafe(query, ...params);

    res.json({
      success: true,
      conversations: conversations,
      count: conversations.length
    });

  } catch (error) {
    console.error('[AI Conversations] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai/health
 * Check AI service health
 */
// Already defined at the top - removed duplicate

/**
 * DELETE /api/ai/conversations/:id
 * Delete a specific conversation
 */
router.delete('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    await prisma.$queryRawUnsafe(`
      DELETE FROM ai_conversations
      WHERE id = $1 AND user_id = $2
    `, parseInt(id), userId);

    res.json({
      success: true,
      message: 'Conversation deleted'
    });

  } catch (error) {
    console.error('[AI Delete Conversation] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
