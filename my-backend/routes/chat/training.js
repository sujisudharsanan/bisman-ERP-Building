/**
 * =====================================================
 * CHAT TRAINING MANAGEMENT API
 * =====================================================
 * Endpoints for:
 * - Feedback collection
 * - Learning queue management
 * - Training data CRUD
 * - Analytics dashboard
 * - Entity type management
 * - Intent flow configuration
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const advancedTrainingService = require('../../services/ai/advancedTrainingService');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'BISMAN',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

// Middleware to check admin permission
const requireAdmin = (req, res, next) => {
  const userRole = req.user?.role || req.user?.role_name;
  const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole === 'owner';
  
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};

// =====================================================
// FEEDBACK ENDPOINTS
// =====================================================

/**
 * POST /api/chat/training/feedback
 * Record user feedback on a response
 */
router.post('/feedback', async (req, res) => {
  try {
    const { conversationId, messageId, feedbackType, feedbackValue, correction, trainingId } = req.body;
    const userId = req.user?.id || req.user?.userId;
    
    if (!feedbackType) {
      return res.status(400).json({ success: false, error: 'feedbackType is required' });
    }
    
    const success = await advancedTrainingService.recordFeedback(
      conversationId,
      messageId,
      userId,
      trainingId,
      feedbackType,
      feedbackValue,
      correction
    );
    
    res.json({ success, message: 'Feedback recorded. Thank you!' });
  } catch (error) {
    console.error('[Training API] Feedback error:', error);
    res.status(500).json({ success: false, error: 'Failed to record feedback' });
  }
});

/**
 * POST /api/chat/training/thumbs
 * Quick thumbs up/down feedback
 */
router.post('/thumbs', async (req, res) => {
  try {
    const { messageId, trainingId, isPositive } = req.body;
    const userId = req.user?.id || req.user?.userId;
    
    const feedbackType = isPositive ? 'positive' : 'negative';
    const feedbackValue = isPositive ? 1 : -1;
    
    const success = await advancedTrainingService.recordFeedback(
      null,
      messageId,
      userId,
      trainingId,
      feedbackType,
      feedbackValue
    );
    
    res.json({ success, message: isPositive ? '👍 Thanks!' : '👎 We\'ll improve!' });
  } catch (error) {
    console.error('[Training API] Thumbs error:', error);
    res.status(500).json({ success: false, error: 'Failed to record feedback' });
  }
});

// =====================================================
// LEARNING QUEUE ENDPOINTS (Admin only)
// =====================================================

/**
 * GET /api/chat/training/queue
 * Get learning queue items for review
 */
router.get('/queue', requireAdmin, async (req, res) => {
  try {
    const { status = 'pending', limit = 50 } = req.query;
    
    const items = await advancedTrainingService.getLearningQueue(status, parseInt(limit));
    
    res.json({ success: true, data: items, count: items.length });
  } catch (error) {
    console.error('[Training API] Queue error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch queue' });
  }
});

/**
 * POST /api/chat/training/queue/:id/approve
 * Approve a learning queue item and create training
 */
router.post('/queue/:id/approve', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { intent, responseTemplate, category } = req.body;
    const reviewerId = req.user?.id || req.user?.userId;
    
    if (!intent || !responseTemplate) {
      return res.status(400).json({ 
        success: false, 
        error: 'intent and responseTemplate are required' 
      });
    }
    
    const success = await advancedTrainingService.approveLearningItem(
      parseInt(id),
      intent,
      responseTemplate,
      category || 'general',
      reviewerId
    );
    
    if (success) {
      res.json({ success: true, message: 'Training data created successfully' });
    } else {
      res.status(400).json({ success: false, error: 'Failed to approve item' });
    }
  } catch (error) {
    console.error('[Training API] Approve error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve' });
  }
});

/**
 * POST /api/chat/training/queue/:id/reject
 * Reject a learning queue item
 */
router.post('/queue/:id/reject', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user?.id || req.user?.userId;
    
    await pool.query(`
      UPDATE chat_learning_queue
      SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW()
      WHERE id = $2
    `, [reviewerId, id]);
    
    res.json({ success: true, message: 'Item rejected' });
  } catch (error) {
    console.error('[Training API] Reject error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject' });
  }
});

/**
 * POST /api/chat/training/queue/:id/merge
 * Merge learning item with existing training
 */
router.post('/queue/:id/merge', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { trainingId } = req.body;
    const reviewerId = req.user?.id || req.user?.userId;
    
    // Get the learning item
    const itemResult = await pool.query(`
      SELECT user_message, similar_messages FROM chat_learning_queue WHERE id = $1
    `, [id]);
    
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    
    const item = itemResult.rows[0];
    const newExamples = [item.user_message, ...(item.similar_messages || [])];
    
    // Get existing training data
    const trainingResult = await pool.query(`
      SELECT examples FROM chat_training_data WHERE id = $1
    `, [trainingId]);
    
    if (trainingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Training data not found' });
    }
    
    const existingExamples = trainingResult.rows[0].examples || [];
    const mergedExamples = [...new Set([...existingExamples, ...newExamples])];
    
    // Update training data
    await pool.query(`
      UPDATE chat_training_data
      SET examples = $1, updated_at = NOW()
      WHERE id = $2
    `, [mergedExamples, trainingId]);
    
    // Update queue item
    await pool.query(`
      UPDATE chat_learning_queue
      SET status = 'merged', reviewed_by = $1, reviewed_at = NOW()
      WHERE id = $2
    `, [reviewerId, id]);
    
    // Retrain
    await advancedTrainingService.retrain();
    
    res.json({ success: true, message: 'Merged successfully' });
  } catch (error) {
    console.error('[Training API] Merge error:', error);
    res.status(500).json({ success: false, error: 'Failed to merge' });
  }
});

// =====================================================
// TRAINING DATA CRUD (Admin only)
// =====================================================

/**
 * GET /api/chat/training/data
 * Get all training data
 */
router.get('/data', requireAdmin, async (req, res) => {
  try {
    const { category, isActive = true, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT id, pattern, intent, response_template, category, priority,
             examples, keywords, is_active, success_rate, total_matches,
             positive_feedback, negative_feedback, created_at, updated_at
      FROM chat_training_data
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(category);
    }
    
    if (isActive !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      params.push(isActive === 'true' || isActive === true);
    }
    
    query += ` ORDER BY priority DESC, success_rate DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    
    // Get total count
    const countResult = await pool.query(`SELECT COUNT(*) as total FROM chat_training_data`);
    
    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('[Training API] Data fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch training data' });
  }
});

/**
 * POST /api/chat/training/data
 * Create new training data
 */
router.post('/data', requireAdmin, async (req, res) => {
  try {
    const { pattern, intent, responseTemplate, category, priority, examples, keywords } = req.body;
    
    if (!pattern || !intent || !responseTemplate) {
      return res.status(400).json({
        success: false,
        error: 'pattern, intent, and responseTemplate are required'
      });
    }
    
    const result = await pool.query(`
      INSERT INTO chat_training_data 
      (pattern, intent, response_template, category, priority, examples, keywords)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [pattern, intent, responseTemplate, category || 'general', priority || 5, 
        examples || [], keywords || []]);
    
    // Retrain classifier
    await advancedTrainingService.retrain();
    
    res.json({ success: true, id: result.rows[0].id, message: 'Training data created' });
  } catch (error) {
    console.error('[Training API] Create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create training data' });
  }
});

/**
 * PUT /api/chat/training/data/:id
 * Update training data
 */
router.put('/data/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { pattern, intent, responseTemplate, category, priority, examples, keywords, isActive } = req.body;
    
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (pattern !== undefined) {
      updates.push(`pattern = $${paramIndex++}`);
      params.push(pattern);
    }
    if (intent !== undefined) {
      updates.push(`intent = $${paramIndex++}`);
      params.push(intent);
    }
    if (responseTemplate !== undefined) {
      updates.push(`response_template = $${paramIndex++}`);
      params.push(responseTemplate);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      params.push(category);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      params.push(priority);
    }
    if (examples !== undefined) {
      updates.push(`examples = $${paramIndex++}`);
      params.push(examples);
    }
    if (keywords !== undefined) {
      updates.push(`keywords = $${paramIndex++}`);
      params.push(keywords);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(isActive);
    }
    
    updates.push(`updated_at = NOW()`);
    params.push(parseInt(id));
    
    await pool.query(`
      UPDATE chat_training_data
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `, params);
    
    // Retrain classifier
    await advancedTrainingService.retrain();
    
    res.json({ success: true, message: 'Training data updated' });
  } catch (error) {
    console.error('[Training API] Update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update training data' });
  }
});

/**
 * DELETE /api/chat/training/data/:id
 * Soft delete training data
 */
router.delete('/data/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(`
      UPDATE chat_training_data SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `, [id]);
    
    // Retrain classifier
    await advancedTrainingService.retrain();
    
    res.json({ success: true, message: 'Training data deactivated' });
  } catch (error) {
    console.error('[Training API] Delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete training data' });
  }
});

// =====================================================
// ANALYTICS ENDPOINTS
// =====================================================

/**
 * GET /api/chat/training/analytics
 * Get training analytics
 */
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const analytics = await advancedTrainingService.getAnalytics(parseInt(days));
    
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('[Training API] Analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/chat/training/analytics/summary
 * Get quick summary stats
 */
router.get('/analytics/summary', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM chat_training_data WHERE is_active = true) as total_training,
        (SELECT COUNT(*) FROM chat_learning_queue WHERE status = 'pending') as pending_review,
        (SELECT COUNT(*) FROM chat_feedback WHERE DATE(created_at) = CURRENT_DATE) as feedback_today,
        (SELECT COUNT(*) FROM chat_conversation_context WHERE DATE(created_at) = CURRENT_DATE) as messages_today,
        (SELECT AVG(success_rate) FROM chat_training_data WHERE total_matches > 0) as avg_success_rate,
        (SELECT COUNT(DISTINCT category) FROM chat_training_data WHERE is_active = true) as total_categories
    `);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Training API] Summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch summary' });
  }
});

/**
 * POST /api/chat/training/analytics/aggregate
 * Manually trigger analytics aggregation
 */
router.post('/analytics/aggregate', requireAdmin, async (req, res) => {
  try {
    await advancedTrainingService.aggregateDailyAnalytics();
    res.json({ success: true, message: 'Analytics aggregated' });
  } catch (error) {
    console.error('[Training API] Aggregate error:', error);
    res.status(500).json({ success: false, error: 'Failed to aggregate analytics' });
  }
});

// =====================================================
// ENTITY MANAGEMENT
// =====================================================

/**
 * GET /api/chat/training/entities
 * Get all entity types
 */
router.get('/entities', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, entity_name, entity_type, patterns, values, synonyms, 
             description, examples, is_active, created_at
      FROM chat_entity_types
      ORDER BY entity_name
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Training API] Entities error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch entities' });
  }
});

/**
 * POST /api/chat/training/entities
 * Create new entity type
 */
router.post('/entities', requireAdmin, async (req, res) => {
  try {
    const { entityName, entityType, patterns, values, synonyms, description, examples } = req.body;
    
    if (!entityName || !entityType) {
      return res.status(400).json({
        success: false,
        error: 'entityName and entityType are required'
      });
    }
    
    const result = await pool.query(`
      INSERT INTO chat_entity_types 
      (entity_name, entity_type, patterns, values, synonyms, description, examples)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [entityName, entityType, patterns || [], values || {}, synonyms || {}, description, examples || []]);
    
    // Reload entities
    await advancedTrainingService.loadEntityTypes();
    
    res.json({ success: true, id: result.rows[0].id, message: 'Entity type created' });
  } catch (error) {
    console.error('[Training API] Create entity error:', error);
    res.status(500).json({ success: false, error: 'Failed to create entity' });
  }
});

// =====================================================
// RESPONSE VARIANTS (A/B Testing)
// =====================================================

/**
 * GET /api/chat/training/variants/:trainingId
 * Get response variants for training
 */
router.get('/variants/:trainingId', requireAdmin, async (req, res) => {
  try {
    const { trainingId } = req.params;
    
    const result = await pool.query(`
      SELECT id, variant_name, response_template, weight, impressions,
             positive_reactions, negative_reactions, conversion_rate, is_active
      FROM chat_response_variants
      WHERE training_data_id = $1
      ORDER BY conversion_rate DESC
    `, [trainingId]);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Training API] Variants error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch variants' });
  }
});

/**
 * POST /api/chat/training/variants
 * Create response variant
 */
router.post('/variants', requireAdmin, async (req, res) => {
  try {
    const { trainingId, variantName, responseTemplate, weight } = req.body;
    
    if (!trainingId || !responseTemplate) {
      return res.status(400).json({
        success: false,
        error: 'trainingId and responseTemplate are required'
      });
    }
    
    const result = await pool.query(`
      INSERT INTO chat_response_variants 
      (training_data_id, variant_name, response_template, weight)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [trainingId, variantName || 'variant', responseTemplate, weight || 0.5]);
    
    res.json({ success: true, id: result.rows[0].id, message: 'Variant created' });
  } catch (error) {
    console.error('[Training API] Create variant error:', error);
    res.status(500).json({ success: false, error: 'Failed to create variant' });
  }
});

// =====================================================
// UTILITIES
// =====================================================

/**
 * POST /api/chat/training/retrain
 * Manually retrain the classifier
 */
router.post('/retrain', requireAdmin, async (req, res) => {
  try {
    await advancedTrainingService.retrain();
    res.json({ success: true, message: 'Classifier retrained successfully' });
  } catch (error) {
    console.error('[Training API] Retrain error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrain' });
  }
});

/**
 * POST /api/chat/training/test
 * Test classification on a message
 */
router.post('/test', requireAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }
    
    // Initialize if not already
    await advancedTrainingService.init();
    
    const classification = await advancedTrainingService.classifyWithSimilarity(message);
    const entities = advancedTrainingService.extractEntities(message);
    
    res.json({
      success: true,
      data: {
        message,
        classification,
        entities
      }
    });
  } catch (error) {
    console.error('[Training API] Test error:', error);
    res.status(500).json({ success: false, error: 'Failed to test' });
  }
});

/**
 * GET /api/chat/training/categories
 * Get all unique categories
 */
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM chat_training_data
      WHERE is_active = true
      GROUP BY category
      ORDER BY count DESC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Training API] Categories error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

/**
 * GET /api/chat/training/intents
 * Get all unique intents
 */
router.get('/intents', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT intent, category, total_matches, success_rate
      FROM chat_training_data
      WHERE is_active = true
      ORDER BY total_matches DESC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Training API] Intents error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch intents' });
  }
});

module.exports = router;
