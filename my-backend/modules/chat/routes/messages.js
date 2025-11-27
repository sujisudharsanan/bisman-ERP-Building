/**
 * =====================================================
 * UNIFIED CHAT API ROUTES - RBAC Protected
 * =====================================================
 * Single endpoint for all chat interactions
 * Features: RBAC, database-driven, dynamic responses
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const { getUnifiedChat } = require('../../../services/ai/unifiedChatEngine');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'BISMAN',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware to extract user from request
const extractUser = (req, res, next) => {
  // Try different auth methods
  const userId = req.user?.id || req.user?.userId || req.headers['x-user-id'] || req.body.userId;
  
  if (!userId) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to use the chat'
    });
  }
  
  req.userId = parseInt(userId);
  next();
};

router.use(extractUser);

/**
 * POST /api/unified-chat/message
 * Send a message to the chat
 */
router.post('/message', async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const userId = req.userId;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Message is required' 
      });
    }
    
    const chat = getUnifiedChat();
    const result = await chat.processMessage(userId, message, conversationId);
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('[UnifiedChat API] Error processing message:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      response: "I'm sorry, I encountered an error. Please try again."
    });
  }
});

/**
 * POST /api/unified-chat/greeting
 * Get personalized greeting
 */
router.post('/greeting', async (req, res) => {
  try {
    const userId = req.userId;
    const chat = getUnifiedChat();
    const result = await chat.generateGreeting(userId);
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('[UnifiedChat API] Error generating greeting:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      greeting: 'Hello! How can I help you today?'
    });
  }
});

/**
 * POST /api/unified-chat/feedback
 * Submit feedback on a message
 */
router.post('/feedback', async (req, res) => {
  try {
    const { messageId, helpful, feedbackType, comment } = req.body;
    const userId = req.userId;
    
    if (!messageId) {
      return res.status(400).json({ 
        error: 'Message ID is required' 
      });
    }
    
    const chat = getUnifiedChat();
    const result = await chat.submitFeedback(
      userId, 
      messageId, 
      helpful, 
      feedbackType || (helpful ? 'thumbs_up' : 'thumbs_down'),
      comment
    );
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('[UnifiedChat API] Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/unified-chat/correction
 * Submit a correction
 */
router.post('/correction', async (req, res) => {
  try {
    const { 
      messageId, 
      originalMessage, 
      correctedMessage, 
      originalIntent, 
      correctedIntent 
    } = req.body;
    const userId = req.userId;
    
    if (!messageId || !originalMessage || !correctedMessage) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }
    
    const chat = getUnifiedChat();
    const result = await chat.storeCorrection(
      userId,
      messageId,
      originalMessage,
      correctedMessage,
      originalIntent,
      correctedIntent
    );
    
    res.json({
      success: true,
      message: 'Thank you! I learned from your correction.',
      ...result
    });
    
  } catch (error) {
    console.error('[UnifiedChat API] Error storing correction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/unified-chat/history
 * Get conversation history
 */
router.get('/history', async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 50;
    
    const chat = getUnifiedChat();
    const history = await chat.getUserHistory(userId, limit);
    
    res.json({
      success: true,
      history,
      total: history.length
    });
    
  } catch (error) {
    console.error('[UnifiedChat API] Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      history: []
    });
  }
});

/**
 * GET /api/unified-chat/conversations
 * Get user's conversations
 */
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await pool.query(`
      SELECT 
        cc.id,
        cc.title,
        cc.context_type,
        cc.created_at,
        cc.last_message_at,
        COUNT(cm.id) as message_count
      FROM chat_conversations cc
      LEFT JOIN chat_messages cm ON cc.id = cm.conversation_id
      WHERE cc.user_id = $1 AND cc.is_active = true
      GROUP BY cc.id
      ORDER BY cc.last_message_at DESC
      LIMIT $2
    `, [userId, limit]);
    
    res.json({
      success: true,
      conversations: result.rows,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('[UnifiedChat API] Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      conversations: []
    });
  }
});

/**
 * GET /api/unified-chat/conversation/:id
 * Get specific conversation with messages
 */
router.get('/conversation/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const conversationId = parseInt(req.params.id);
    
    // Verify ownership
    const convResult = await pool.query(`
      SELECT * FROM chat_conversations
      WHERE id = $1 AND user_id = $2
    `, [conversationId, userId]);
    
    if (convResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found or access denied'
      });
    }
    
    // Get messages
    const messagesResult = await pool.query(`
      SELECT 
        id, role, content, intent, entities,
        response_metadata, feedback, is_correction,
        created_at
      FROM chat_messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `, [conversationId]);
    
    res.json({
      success: true,
      conversation: convResult.rows[0],
      messages: messagesResult.rows
    });
    
  } catch (error) {
    console.error('[UnifiedChat API] Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/unified-chat/analytics
 * Get chat analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const userId = req.userId;
    
    const chat = getUnifiedChat();
    const analytics = await chat.getAnalytics(userId);
    
    // Get additional stats
    const [messagesCount, conversationsCount, feedbackCount] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) as count FROM chat_messages
        WHERE user_id = $1 AND role = 'user'
      `, [userId]),
      pool.query(`
        SELECT COUNT(*) as count FROM chat_conversations
        WHERE user_id = $1
      `, [userId]),
      pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE helpful = true) as positive,
          COUNT(*) FILTER (WHERE helpful = false) as negative
        FROM chat_feedback
        WHERE user_id = $1
      `, [userId])
    ]);
    
    res.json({
      success: true,
      analytics,
      stats: {
        totalMessages: parseInt(messagesCount.rows[0].count),
        totalConversations: parseInt(conversationsCount.rows[0].count),
        positiveFeedback: parseInt(feedbackCount.rows[0]?.positive || 0),
        negativeFeedback: parseInt(feedbackCount.rows[0]?.negative || 0)
      }
    });
    
  } catch (error) {
    console.error('[UnifiedChat API] Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/unified-chat/suggestions
 * Get suggested messages based on context
 */
router.get('/suggestions', async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get user's role
    const userResult = await pool.query(`
      SELECT u.role_id, r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [userId]);
    
    const roleName = userResult.rows[0]?.role_name;
    
    // Role-based suggestions
    let suggestions = [
      'Show my pending tasks',
      'What are my pending approvals?',
      'Help me with reports'
    ];
    
    if (roleName?.toLowerCase().includes('admin')) {
      suggestions = [
        'Show system analytics',
        'List all pending approvals',
        'Generate admin report',
        'Show user activity'
      ];
    } else if (roleName?.toLowerCase().includes('manager')) {
      suggestions = [
        'Show my team tasks',
        'Pending approvals',
        'Team performance report',
        'Create new task'
      ];
    }
    
    res.json({
      success: true,
      suggestions
    });
    
  } catch (error) {
    console.error('[UnifiedChat API] Error generating suggestions:', error);
    res.status(500).json({
      success: false,
      suggestions: ['Show my tasks', 'Help']
    });
  }
});

/**
 * POST /api/unified-chat/training (Admin only)
 * Add training data
 */
router.post('/training', async (req, res) => {
  try {
    const userId = req.userId;
    const { pattern, intent, responseTemplate, category, requiresPermission, examples } = req.body;
    
    // Check if user is admin
    const userResult = await pool.query(`
      SELECT r.role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [userId]);
    
    const roleName = userResult.rows[0]?.role_name?.toLowerCase();
    if (!roleName?.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    // Insert training data
    await pool.query(`
      INSERT INTO chat_training_data (
        pattern, intent, response_template, category,
        requires_permission, examples, created_by, priority
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 70)
    `, [
      pattern,
      intent,
      responseTemplate,
      category || 'general',
      requiresPermission,
      JSON.stringify(examples || []),
      userId
    ]);
    
    // Reload training
    const chat = getUnifiedChat();
    await chat.loadTrainingData();
    await chat.trainClassifier();
    
    res.json({
      success: true,
      message: 'Training data added successfully'
    });
    
  } catch (error) {
    console.error('[UnifiedChat API] Error adding training:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/unified-chat/health
 * Health check
 */
router.get('/health', async (req, res) => {
  try {
    const chat = getUnifiedChat();
    
    res.json({
      success: true,
      status: 'healthy',
      initialized: chat.initialized,
      stats: chat.stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router;
